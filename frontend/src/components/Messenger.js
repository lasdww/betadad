import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  MicrophoneIcon,
  ArrowRightOnRectangleIcon,
  HeartIcon,
  UserCircleIcon,
  MagnifyingGlassIcon,
  CogIcon,
  XMarkIcon,
  CameraIcon,
  PencilIcon,
  CheckIcon,
  UserPlusIcon,
  ChatBubbleLeftRightIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

const Messenger = () => {
  const { user, logout, token, API, fetchUserProfile } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [editingNick, setEditingNick] = useState(false);
  const [newNick, setNewNick] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    loadChats();
    loadUnreadCounts();
    if (activeTab === 'favorites') {
      loadFavorites();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedChat && selectedChat !== 'Избранное') {
      loadMessages();
    } else if (selectedChat === 'Избранное') {
      loadFavorites();
    }
  }, [selectedChat]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Периодическое обновление непрочитанных сообщений
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'chats') {
        loadUnreadCounts();
      }
    }, 10000); // каждые 10 секунд

    return () => clearInterval(interval);
  }, [activeTab]);

  const loadChats = () => {
    const savedChats = JSON.parse(localStorage.getItem('chatsList') || '[]');
    setChats(savedChats);
  };

  const saveChats = (chatsList) => {
    localStorage.setItem('chatsList', JSON.stringify(chatsList));
    setChats(chatsList);
  };

  const loadUnreadCounts = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API}/unread_chats`, {
        params: { user_id: token }
      });
      setUnreadCounts(response.data || {});
    } catch (error) {
      console.error('Error loading unread counts:', error);
    }
  };

  const loadMessages = async () => {
    if (!selectedChat || selectedChat === 'Избранное') return;

    try {
      const response = await axios.get(`${API}/messages`, {
        params: {
          user_id: token,
          friend_nick: selectedChat
        }
      });
      setMessages(response.data.messages || []);
      
      // Очистить счетчик непрочитанных для этого чата
      if (unreadCounts[selectedChat]) {
        const newUnreadCounts = { ...unreadCounts };
        delete newUnreadCounts[selectedChat];
        setUnreadCounts(newUnreadCounts);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadFavorites = async () => {
    try {
      const response = await axios.get(`${API}/favorites`, {
        params: { token }
      });
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await axios.get(`${API}/search`, {
        params: { nick: query }
      });
      setSearchResults([response.data]);
    } catch (error) {
      setSearchResults([]);
      console.error('Error searching users:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || selectedChat === 'Избранное') return;

    try {
      await axios.post(`${API}/messages`, {
        user_id: token,
        friend_nick: selectedChat,
        text: newMessage
      });

      // Добавить в список чатов если еще нет
      if (!chats.includes(selectedChat)) {
        const updatedChats = [selectedChat, ...chats];
        saveChats(updatedChats);
      }

      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const addToFavorites = async (message) => {
    try {
      await axios.post(`${API}/favorites`, {
        type: 'text',
        text: message ? message.text : newMessage,
        orig: message || null
      }, {
        params: { token }
      });
      
      if (!message) {
        setNewMessage('');
      }
      
      if (activeTab === 'favorites' || selectedChat === 'Избранное') {
        await loadFavorites();
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post(`${API}/upload`, formData, {
        params: { token },
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadResponse.data.url) {
        if (selectedChat === 'Избранное') {
          await axios.post(`${API}/favorites`, {
            type: 'file',
            file_url: uploadResponse.data.url,
            text: `Файл: ${file.name}`
          }, {
            params: { token }
          });
          
          await loadFavorites();
        } else {
          // Отправить файл как сообщение (для будущей реализации)
          console.log('File uploaded:', uploadResponse.data.url);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    
    event.target.value = '';
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await axios.post(`${API}/upload`, formData, {
        params: { token },
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadResponse.data.url) {
        await fetchUserProfile();
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
    }
    
    event.target.value = '';
  };

  const updateNickname = async () => {
    if (!newNick.trim()) return;

    try {
      await axios.post(`${API}/update_profile`, {
        new_username: newNick
      }, {
        params: { token }
      });
      
      await fetchUserProfile();
      setEditingNick(false);
      setNewNick('');
    } catch (error) {
      console.error('Error updating nickname:', error);
    }
  };

  const selectChat = (chatName) => {
    setSelectedChat(chatName);
    setActiveTab('chats');
  };

  const addUserToChats = (userNick) => {
    if (!chats.includes(userNick)) {
      const updatedChats = [userNick, ...chats];
      saveChats(updatedChats);
    }
    setSelectedChat(userNick);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getInitials = (name) => {
    return name ? name.slice(0, 2).toUpperCase() : '??';
  };

  const renderMessage = (message, index) => {
    const isMyMessage = message.from === user?.nick;
    
    return (
      <div
        key={index}
        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'} animate-fadeIn`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative group ${
          isMyMessage
            ? 'bg-blue-500 text-white rounded-br-md'
            : 'bg-white text-gray-900 rounded-bl-md shadow-sm border'
        }`}>
          {!isMyMessage && (
            <p className="text-xs text-blue-600 font-medium mb-1">
              {message.from}
            </p>
          )}
          <p className="break-words">{message.text}</p>
          <div className="flex items-center justify-between mt-1">
            <p className={`text-xs ${
              isMyMessage ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {formatTime(message.timestamp)}
            </p>
            
            {/* Кнопка добавления в избранное */}
            <button
              onClick={() => addToFavorites(message)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              title="Добавить в избранное"
            >
              <HeartIcon className="w-3 h-3 text-gray-400 hover:text-red-500" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderFavoriteMessage = (fav, index) => {
    const isFile = fav.type === 'file' && fav.file_url;
    const isVoice = fav.type === 'voice' && fav.voice_url;

    return (
      <div key={index} className="flex justify-end animate-fadeIn" style={{ animationDelay: `${index * 0.1}s` }}>
        <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-md">
          {isFile ? (
            <div>
              <a 
                href={fav.file_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-100 hover:text-white underline"
              >
                📎 {fav.text || 'Файл'}
              </a>
            </div>
          ) : isVoice ? (
            <div>
              <audio controls className="w-full">
                <source src={fav.voice_url} type="audio/webm" />
                Ваш браузер не поддерживает аудио элемент.
              </audio>
            </div>
          ) : (
            <p className="break-words">{fav.text}</p>
          )}
          
          <p className="text-xs text-blue-100 mt-2">
            {formatTime(fav.timestamp)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100 relative">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div 
              className="flex items-center space-x-3 cursor-pointer hover:bg-blue-500 rounded-lg p-2 transition-all duration-200 transform hover:scale-105"
              onClick={() => setShowSettings(true)}
            >
              <div className="relative w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden group">
                {user?.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold">
                    {getInitials(user?.nick)}
                  </span>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <CogIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold">{user?.nick}</h3>
                <p className="text-xs text-blue-100">В сети</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                title="Поиск пользователей"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                title="Выйти"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Section */}
        {showSearch && (
          <div className="p-4 border-b border-gray-200 bg-gray-50 animate-slideDown">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Поиск по нику#тег..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.user_id}
                    onClick={() => addUserToChats(result.nick)}
                    className="p-3 bg-white rounded-lg hover:bg-gray-100 cursor-pointer transition-all duration-200 transform hover:scale-105 border border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center overflow-hidden">
                        {result.avatar ? (
                          <img 
                            src={result.avatar} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-semibold text-sm">
                            {getInitials(result.nick)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{result.nick}</p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-2 ${result.online ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                          {result.online ? 'В сети' : 'Не в сети'}
                          {!result.online && result.last_online && (
                            <span className="ml-1">
                              (был: {new Date(result.last_online * 1000).toLocaleDateString('ru-RU')})
                            </span>
                          )}
                        </p>
                      </div>
                      <UserPlusIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && searchResults.length === 0 && (
              <div className="mt-3 p-3 text-center text-gray-500">
                <UserCircleIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Пользователь не найден</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'chats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-2" />
            Чаты
          </button>
          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex-1 p-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'favorites'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <HeartIcon className="w-4 h-4 inline mr-2" />
            Избранное
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chats' && (
            <>
              {/* Избранное как первый элемент */}
              <div
                onClick={() => selectChat('Избранное')}
                className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-all duration-200 ${
                  selectedChat === 'Избранное' ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                    <HeartSolid className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Избранное</h4>
                    <p className="text-sm text-gray-500">Сохранённые сообщения</p>
                  </div>
                </div>
              </div>

              {/* User chats */}
              {chats.map((chat, index) => (
                <div
                  key={chat}
                  onClick={() => selectChat(chat)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 transition-all duration-200 animate-slideUp ${
                    selectedChat === chat ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {getInitials(chat)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{chat}</h4>
                        {unreadCounts[chat] && (
                          <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center animate-pulse">
                            {unreadCounts[chat]}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Нажмите для открытия чата</p>
                    </div>
                  </div>
                </div>
              ))}

              {chats.length === 0 && (
                <div className="p-8 text-center text-gray-500 animate-fadeIn">
                  <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">Пока нет чатов</p>
                  <p className="text-sm">Найдите пользователей для начала общения</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'favorites' && (
            <div className="p-4">
              {favorites.length === 0 ? (
                <div className="text-center text-gray-500 py-8 animate-fadeIn">
                  <HeartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 animate-bounce" />
                  <p className="font-medium">Пока ничего нет</p>
                  <p className="text-sm">Добавьте сообщения в избранное</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {favorites.map((fav, index) => (
                    <div 
                      key={index} 
                      onClick={() => selectChat('Избранное')}
                      className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 cursor-pointer animate-slideUp"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <p className="text-sm text-gray-900 mb-1">
                        {fav.type === 'file' && fav.file_url ? (
                          <span className="text-blue-600">📎 {fav.text || 'Файл'}</span>
                        ) : fav.type === 'voice' && fav.voice_url ? (
                          <span className="text-purple-600">🎵 Голосовое сообщение</span>
                        ) : (
                          fav.text
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(fav.timestamp)} в {formatTime(fav.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    {selectedChat === 'Избранное' ? (
                      <HeartSolid className="w-5 h-5 text-white" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {getInitials(selectedChat)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedChat}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedChat === 'Избранное' ? 'Ваши сохранённые сообщения' : 'В сети'}
                    </p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {selectedChat === 'Избранное' ? (
                favorites.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center animate-fadeIn">
                      <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <HeartSolid className="w-12 h-12 text-red-500" />
                      </div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        Избранные сообщения
                      </h2>
                      <p className="text-gray-600 mb-6">
                        Здесь будут храниться ваши важные сообщения, файлы и заметки
                      </p>
                      <div className="space-y-2 text-sm text-gray-500">
                        <p>• Добавляйте текстовые сообщения</p>
                        <p>• Загружайте файлы и документы</p>
                        <p>• Записывайте голосовые заметки</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {favorites.map((fav, index) => renderFavoriteMessage(fav, index))}
                    <div ref={messagesEndRef} />
                  </>
                )
              ) : (
                messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center animate-fadeIn">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ChatBubbleLeftRightIcon className="w-12 h-12 text-blue-500" />
                      </div>
                      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                        Начните общение
                      </h2>
                      <p className="text-gray-600">
                        Отправьте первое сообщение пользователю {selectedChat}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => renderMessage(message, index))}
                    <div ref={messagesEndRef} />
                  </>
                )
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 transform hover:scale-110"
                  title="Прикрепить файл"
                >
                  <PaperClipIcon className="w-5 h-5" />
                </button>
                
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder={selectedChat === 'Избранное' ? 'Добавить в избранное...' : 'Напишите сообщение...'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        if (selectedChat === 'Избранное') {
                          addToFavorites();
                        } else {
                          sendMessage();
                        }
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 transform hover:scale-110">
                  <MicrophoneIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={selectedChat === 'Избранное' ? addToFavorites : sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  title={selectedChat === 'Избранное' ? 'Добавить в избранное' : 'Отправить сообщение'}
                >
                  {selectedChat === 'Избранное' ? (
                    <HeartSolid className="w-5 h-5" />
                  ) : (
                    <PaperAirplaneIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center animate-fadeIn">
              <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <ChatBubbleLeftRightIcon className="w-16 h-16 text-blue-500" />
              </div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-4">
                Добро пожаловать в Messenger
              </h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Выберите чат для начала общения или найдите пользователей для новых разговоров
              </p>
              <div className="space-y-3 text-sm text-gray-500 max-w-sm mx-auto">
                <div className="flex items-center space-x-3">
                  <MagnifyingGlassIcon className="w-5 h-5 text-blue-500" />
                  <span>Найдите пользователей по нику#тег</span>
                </div>
                <div className="flex items-center space-x-3">
                  <HeartIcon className="w-5 h-5 text-red-500" />
                  <span>Сохраняйте важные сообщения в Избранное</span>
                </div>
                <div className="flex items-center space-x-3">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-500" />
                  <span>Общайтесь с друзьями в реальном времени</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slideUp">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Настройки</h2>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setEditingNick(false);
                  setNewNick('');
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Profile Section */}
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-semibold text-lg">
                        {getInitials(user?.nick)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-all duration-200 transform hover:scale-110"
                  >
                    <CameraIcon className="w-4 h-4" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>

                <div className="mt-4 text-center w-full">
                  {editingNick ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newNick}
                        onChange={(e) => setNewNick(e.target.value)}
                        placeholder={user?.nick?.split('#')[0]}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={updateNickname}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingNick(false);
                          setNewNick('');
                        }}
                        className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">{user?.nick}</h3>
                      <button
                        onClick={() => {
                          setEditingNick(true);
                          setNewNick(user?.nick?.split('#')[0] || '');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">ID: {user?.user_id}</p>
                </div>
              </div>

              {/* Settings Options */}
              <div className="space-y-3">
                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserCircleIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Аккаунт</p>
                    <p className="text-sm text-gray-500">Изменить данные профиля</p>
                  </div>
                </button>

                <button className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <HeartIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Избранное</p>
                    <p className="text-sm text-gray-500">Управление сохранёнными сообщениями</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={logout}
                className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Выйти из аккаунта
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messenger;