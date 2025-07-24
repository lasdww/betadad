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
      {/* Sidebar - только Избранное */}
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
                <p className="text-xs text-blue-100">Онлайн</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              title="Выйти"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Избранное Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
              <HeartSolid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Избранное</h4>
              <p className="text-sm text-gray-500">Сохранённые сообщения</p>
            </div>
          </div>
        </div>

        {/* Избранное Messages List */}
        <div className="flex-1 overflow-y-auto p-4">
          {favorites.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <HeartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="font-medium">Пока ничего нет</p>
              <p className="text-sm">Добавьте сообщения в избранное</p>
            </div>
          ) : (
            <div className="space-y-3">
              {favorites.map((fav, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors">
                  <p className="text-sm text-gray-900 mb-1">
                    {fav.type === 'file' && fav.file_url ? (
                      <a 
                        href={fav.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        📎 {fav.text || 'Файл'}
                      </a>
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
      </div>

      {/* Main Chat Area - Избранное */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <HeartSolid className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Избранное</h3>
              <p className="text-sm text-gray-500">Ваши сохранённые сообщения</p>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {favorites.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
              {favorites.map((fav, index) => (
                <div key={index} className="flex justify-end">
                  {renderFavoriteMessage(fav, index)}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
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
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Прикрепить файл"
            >
              <PaperClipIcon className="w-5 h-5" />
            </button>
            
            <div className="flex-1">
              <input
                type="text"
                placeholder="Добавить в избранное..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addToFavorites()}
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <MicrophoneIcon className="w-5 h-5" />
            </button>

            <button
              onClick={addToFavorites}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Добавить в избранное"
            >
              <HeartSolid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messenger;