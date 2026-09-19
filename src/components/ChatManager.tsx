import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from 'firebase/auth';
import { Trash2, Edit3, MessageSquare, Plus } from 'lucide-react';

export const ChatManager = ({ user }: { user: User }) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'chats'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const createChat = async () => {
    await addDoc(collection(db, 'chats'), {
      userId: user.uid,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const deleteChat = async (chatId: string) => {
    await deleteDoc(doc(db, 'chats', chatId));
  };

  const renameChat = async (chatId: string, title: string) => {
    await updateDoc(doc(db, 'chats', chatId), { title, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-mono font-black text-text-p">CHATS</h2>
        <button onClick={createChat} className="p-2 bg-cyan text-black rounded-lg">
          <Plus size={16} />
        </button>
      </div>
      <div className="space-y-2">
        {chats.map(chat => (
          <div key={chat.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
            <p className="text-sm font-mono text-text-p">{chat.title}</p>
            <div className="flex gap-2">
              <button onClick={() => {
                const title = prompt("Rename chat:", chat.title);
                if (title) renameChat(chat.id, title);
              }}><Edit3 size={16} /></button>
              <button onClick={() => deleteChat(chat.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
