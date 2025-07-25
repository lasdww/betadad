from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, func, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
import os
import shutil
import time
import json
import random
import string
from datetime import datetime, timedelta
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# SQLite Database setup (for development)
SQLALCHEMY_DATABASE_URL = "sqlite:///./messenger.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    avatar = Column(String, nullable=True)
    last_online = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    # Privacy settings
    invisible_mode = Column(Boolean, default=False)
    hide_last_seen = Column(Boolean, default=False)
    hide_profile_info = Column(Boolean, default=False)
    # Theme settings
    theme = Column(String, default='light')  # light, dark, custom
    custom_primary_color = Column(String, default='#3B82F6')
    custom_secondary_color = Column(String, default='#1E40AF')

class Message(Base):
    __tablename__ = 'messages'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id = Column(String, ForeignKey('users.id'))
    receiver_id = Column(String, ForeignKey('users.id'))
    text = Column(Text)
    timestamp = Column(DateTime, default=func.now())
    is_read = Column(Boolean, default=False)

class FavoriteMessage(Base):
    __tablename__ = 'favorite_messages'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'))
    type = Column(String, default='text')
    text = Column(Text, nullable=True)
    file_url = Column(String, nullable=True)
    voice_url = Column(String, nullable=True)
    timestamp = Column(DateTime, default=func.now())
    orig = Column(Text, nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class MessageCreate(BaseModel):
    user_id: str
    friend_nick: str
    text: str

class FavoriteCreate(BaseModel):
    type: str = "text"
    text: Optional[str] = ""
    file_url: Optional[str] = None
    voice_url: Optional[str] = None
    orig: Optional[dict] = None

class ProfileUpdate(BaseModel):
    new_username: str

# Create the main app
app = FastAPI()

# Create upload directory
UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

def update_last_online(user_id: str, db: Session):
    if not user_id:
        return
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.last_online = datetime.utcnow()
        db.commit()

@api_router.post("/register")
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    
    if existing_user:
        if existing_user.username == user_data.username:
            raise HTTPException(status_code=400, detail="Пользователь с таким именем уже существует")
        else:
            raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")
    
    # Create new user
    user = User(
        username=user_data.username,
        email=user_data.email,
        password=get_password_hash(user_data.password)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"user_id": user.id, "nick": user.username}

@api_router.post("/login")
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    
    # Update last online
    user.last_online = datetime.utcnow()
    db.commit()
    
    return {"token": user.id}

@api_router.get("/me")
async def get_me(token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    return {
        "nick": user.username,
        "user_id": user.id,
        "avatar": user.avatar
    }

@api_router.get("/search")
async def search_user(nick: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username.ilike(f"%{nick}%")).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Check if user is online (last activity within 60 seconds)
    online = (datetime.utcnow() - (user.last_online or datetime.utcnow())) < timedelta(seconds=60)
    last_online = user.last_online.timestamp() if user.last_online else None
    
    return {
        "user_id": user.id,
        "nick": user.username,
        "avatar": user.avatar,
        "online": online,
        "last_online": last_online
    }

@api_router.get("/messages")
async def get_messages(user_id: str, friend_nick: str, db: Session = Depends(get_db)):
    update_last_online(user_id, db)
    
    friend = db.query(User).filter(User.username == friend_nick).first()
    
    if not friend:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Get messages between users
    messages = db.query(Message).filter(
        ((Message.sender_id == user_id) & (Message.receiver_id == friend.id)) |
        ((Message.sender_id == friend.id) & (Message.receiver_id == user_id))
    ).order_by(Message.timestamp).all()
    
    # Mark incoming messages as read
    unread_messages = db.query(Message).filter(
        Message.sender_id == friend.id,
        Message.receiver_id == user_id,
        Message.is_read == False
    ).all()
    
    for msg in unread_messages:
        msg.is_read = True
    db.commit()
    
    # Check friend's online status
    online = (datetime.utcnow() - (friend.last_online or datetime.utcnow())) < timedelta(seconds=60)
    last_online = friend.last_online.timestamp() if friend.last_online else None
    
    # Format messages
    result = []
    for msg in messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        result.append({
            "from": sender.username,
            "text": msg.text,
            "timestamp": msg.timestamp.timestamp(),
            "avatar": sender.avatar
        })
    
    return {
        "messages": result,
        "friend_online": online,
        "friend_last_online": last_online
    }

@api_router.post("/messages")
async def send_message(message_data: MessageCreate, db: Session = Depends(get_db)):
    update_last_online(message_data.user_id, db)
    
    friend = db.query(User).filter(User.username == message_data.friend_nick).first()
    
    if not friend:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    message = Message(
        sender_id=message_data.user_id,
        receiver_id=friend.id,
        text=message_data.text
    )
    
    db.add(message)
    db.commit()
    
    return {"status": "ok"}

@api_router.get("/unread_chats")
async def get_unread_chats(user_id: str, db: Session = Depends(get_db)):
    unread_messages = db.query(Message).filter(
        Message.receiver_id == user_id,
        Message.is_read == False
    ).all()
    
    chat_counts = {}
    for msg in unread_messages:
        sender = db.query(User).filter(User.id == msg.sender_id).first()
        if sender:
            sender_nick = sender.username
            chat_counts[sender_nick] = chat_counts.get(sender_nick, 0) + 1
    
    return chat_counts

@api_router.get("/favorites")
async def get_favorites(token: str, db: Session = Depends(get_db)):
    favorites = db.query(FavoriteMessage).filter(
        FavoriteMessage.user_id == token
    ).order_by(FavoriteMessage.timestamp).all()
    
    result = []
    for fav in favorites:
        fav_data = {
            "type": fav.type,
            "text": fav.text,
            "fileUrl": fav.file_url,
            "voiceUrl": fav.voice_url,
            "timestamp": fav.timestamp.timestamp(),
            "from": "me"
        }
        
        if fav.orig:
            try:
                fav_data["orig"] = json.loads(fav.orig)
            except:
                fav_data["orig"] = fav.orig
        
        result.append(fav_data)
    
    return {"favorites": result}

@api_router.post("/favorites")
async def add_favorite(favorite_data: FavoriteCreate, token: str, db: Session = Depends(get_db)):
    favorite = FavoriteMessage(
        user_id=token,
        type=favorite_data.type,
        text=favorite_data.text,
        file_url=favorite_data.file_url,
        voice_url=favorite_data.voice_url,
        orig=json.dumps(favorite_data.orig) if favorite_data.orig else None
    )
    
    db.add(favorite)
    db.commit()
    
    return {"status": "ok"}

@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), token: str = "", db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="Нет токена")
    
    filename = f"{int(time.time())}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    url = f"/static/uploads/{filename}"
    
    # Update user avatar if it's an image
    if file.content_type and file.content_type.startswith('image/'):
        user = db.query(User).filter(User.id == token).first()
        if user:
            user.avatar = url
            db.commit()
    
    return {"url": url}

@api_router.post("/update_profile")
async def update_profile(profile_data: ProfileUpdate, token: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == token).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Check if username is already taken
    existing_user = db.query(User).filter(
        User.username == profile_data.new_username,
        User.id != token
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Имя пользователя уже занято")
    
    user.username = profile_data.new_username
    db.commit()
    
    return {"ok": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
