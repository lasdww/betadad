import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  MicrophoneIcon,
  ArrowRightOnRectangleIcon,
  HeartIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

const Messenger = () => {
  const { user, logout, token, API } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [favorites]);

  useEffect(() => {
    loadFavorites();
  }, []);

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

  const addToFavorites = async () => {
    if (!newMessage.trim()) return;

    try {
      await axios.post(`${API}/favorites`, {
        type: 'text',
        text: newMessage
      }, {
        params: { token }
      });
      
      setNewMessage('');
      await loadFavorites();
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
        await axios.post(`${API}/favorites`, {
          type: 'file',
          file_url: uploadResponse.data.url,
          text: `Файл: ${file.name}`
        }, {
          params: { token }
        });
        
        await loadFavorites();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
    
    event.target.value = '';
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
    return name ? name.split('#')[0].slice(0, 2).toUpperCase() : '??';
  };

  const renderFavoriteMessage = (fav, index) => {
    const isFile = fav.type === 'file' && fav.file_url;
    const isVoice = fav.type === 'voice' && fav.voice_url;

    return (
      <div key={index} className="bg-blue-500 text-white rounded-lg px-4 py-3 max-w-md ml-auto">
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
          <p>{fav.text}</p>
        )}
        
        <p className="text-xs text-blue-100 mt-2">
          {formatTime(fav.timestamp)}
        </p>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {getInitials(user?.nick)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">{user?.nick}</h3>
                <p className="text-xs text-blue-100">Online</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by nick#tag"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-gray-50 rounded-lg">
              {searchResults.map((result) => (
                <div
                  key={result.user_id}
                  onClick={() => addUserToChats(result.nick)}
                  className="p-3 hover:bg-gray-100 cursor-pointer rounded-lg flex items-center space-x-3"
                >
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold">
                      {getInitials(result.nick)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{result.nick}</p>
                    <p className="text-xs text-gray-500">
                      {result.online ? '🟢 Online' : '🔴 Offline'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
            Chats
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
            Favorites
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chats' && (
            <>
              {/* Favorites as first item */}
              <div
                onClick={() => selectChat('Favorites')}
                className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                  selectedChat === 'Favorites' ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                    <HeartSolid className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">Favorites</h4>
                    <p className="text-sm text-gray-500">Saved messages</p>
                  </div>
                </div>
              </div>

              {/* User chats */}
              {chats.map((chat) => (
                <div
                  key={chat}
                  onClick={() => selectChat(chat)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ${
                    selectedChat === chat ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {getInitials(chat)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{chat}</h4>
                      <p className="text-sm text-gray-500">Click to open chat</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {activeTab === 'favorites' && (
            <div className="p-4">
              {favorites.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <HeartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No favorites yet</p>
                  <p className="text-sm">Click the heart icon on messages to save them</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {favorites.map((fav, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm">{fav.text}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTime(fav.timestamp)}
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
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  {selectedChat === 'Favorites' ? (
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
                    {selectedChat === 'Favorites' ? 'Your saved messages' : 'Active now'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedChat === 'Favorites' ? (
                <div className="text-center text-gray-500 py-8">
                  <HeartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>This is your Favorites chat</p>
                  <p className="text-sm">Messages you favorite will appear here</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => {
                    const isMyMessage = message.from === user?.nick;
                    return (
                      <div
                        key={index}
                        className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                          isMyMessage
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p>{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            isMyMessage ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                          
                          {/* Favorite button */}
                          <button
                            onClick={() => addToFavorites(message)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <HeartIcon className="w-3 h-3 text-gray-600" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            {selectedChat !== 'Favorites' && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <PaperClipIcon className="w-5 h-5" />
                  </button>
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                    <MicrophoneIcon className="w-5 h-5" />
                  </button>

                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <ChatBubbleLeftRightIcon className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome to Messenger
              </h2>
              <p className="text-gray-600 mb-6">
                Select a chat to start messaging or search for users to begin a conversation
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>• Search for users by their nick#tag</p>
                <p>• Save important messages to Favorites</p>
                <p>• Stay connected with your friends</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messenger;