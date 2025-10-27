// Ultra Modern Main Application

import {
    auth,
    db,
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    onSnapshot
} from './firebase-config.js';

import { generateContent, generateTitle, editContent } from './openai-api.js';
import { 
    renderContent, 
    createContentCard, 
    getTypeConfig, 
    initMermaidDiagrams,
    initCharts,
    injectContentStyles,
    copyToClipboard
} from './content-renderer.js';

// App State
let currentUser = null;
let currentChatId = null;
let currentContentType = 'auto';
let allChats = [];
let contentCache = new Map();
let currentEditingContentId = null;

// DOM Elements
const authScreen = document.getElementById('authScreen');
const mainApp = document.getElementById('mainApp');
const sidebar = document.getElementById('sidebar');
const sidebarCollapseBtn = document.getElementById('sidebarCollapseBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const chatList = document.getElementById('chatList');
const chatTitle = document.getElementById('chatTitle');
const contentGrid = document.getElementById('contentGrid');
const welcomeScreen = document.getElementById('welcomeScreen');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const contentTypeBtn = document.getElementById('contentTypeBtn');
const typeMenu = document.getElementById('typeMenu');
const detailModal = document.getElementById('detailModal');
const manualEditModal = document.getElementById('manualEditModal');
const aiEditModal = document.getElementById('aiEditModal');
const themeModal = document.getElementById('themeModal');
const inlineLoading = document.getElementById('inlineLoading');
const chatSearchInput = document.getElementById('chatSearchInput');
const editTitleBtn = document.getElementById('editTitleBtn');
const userEmail = document.getElementById('userEmail');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initEventListeners();
    injectContentStyles();
    loadTheme();
    setupCheckboxHandler();
});

// ========================================
// AUTH
// ========================================

function initAuth() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            showMainApp();
            loadChats();
        } else {
            currentUser = null;
            showAuthScreen();
        }
    });
}

function showAuthScreen() {
    authScreen.style.display = 'flex';
    mainApp.style.display = 'none';
}

function showMainApp() {
    authScreen.style.display = 'none';
    mainApp.style.display = 'grid';
    if (userEmail) {
        userEmail.textContent = currentUser.email;
    }
}

// ========================================
// EVENT LISTENERS
// ========================================

function initEventListeners() {
    // Auth tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            btn.classList.add('active');
            const formId = btn.dataset.tab === 'login' ? 'loginForm' : 'registerForm';
            document.getElementById(formId).classList.add('active');
        });
    });

    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    
    // Google Sign-In
    document.getElementById('googleLoginBtn').addEventListener('click', handleGoogleSignIn);
    document.getElementById('googleRegisterBtn').addEventListener('click', handleGoogleSignIn);
    
    // Sidebar collapse
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', toggleSidebarCollapse);
    }
    
    // User menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    userMenuBtn.addEventListener('click', () => {
        userMenuBtn.classList.toggle('active');
        userDropdown.classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
            userMenuBtn.classList.remove('active');
            userDropdown.classList.remove('active');
        }
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await signOut(auth);
            showAuthScreen();
        } catch (error) {
            showToast('Çıkış başarısız: ' + error.message, 'error');
        }
    });

    // Chat actions
    newChatBtn.addEventListener('click', createNewChat);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    // Content type selection
    contentTypeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = contentTypeBtn.getBoundingClientRect();
        typeMenu.style.left = rect.left + 'px';
        typeMenu.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
        typeMenu.style.display = typeMenu.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelectorAll('.type-option').forEach(option => {
        option.addEventListener('click', () => {
            currentContentType = option.dataset.type;
            updateSelectedType();
            typeMenu.style.display = 'none';
        });
    });

    document.addEventListener('click', (e) => {
        if (!contentTypeBtn.contains(e.target) && !typeMenu.contains(e.target)) {
            typeMenu.style.display = 'none';
        }
    });

    // Suggestions
    document.querySelectorAll('.suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            messageInput.value = btn.dataset.prompt;
            messageInput.focus();
            messageInput.dispatchEvent(new Event('input'));
        });
    });

    // Theme
    document.getElementById('themeBtn').addEventListener('click', () => {
        themeModal.classList.add('active');
        userDropdown.classList.remove('active');
        userMenuBtn.classList.remove('active');
    });

    document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
            const theme = card.dataset.theme;
            document.body.dataset.theme = theme;
            localStorage.setItem('theme', theme);
            themeModal.classList.remove('active');
        });
    });

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            overlay.closest('.modal').classList.remove('active');
        });
    });

    // Chat search
    if (chatSearchInput) {
        chatSearchInput.addEventListener('input', filterChats);
    }

    // Editable title
    if (editTitleBtn) {
        editTitleBtn.addEventListener('click', enableTitleEdit);
    }

    if (chatTitle) {
        chatTitle.addEventListener('blur', saveTitleEdit);
        chatTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                chatTitle.blur();
            }
        });
    }

    // Modal content actions
    const copyContentBtn = document.getElementById('copyContentBtn');
    const manualEditBtn = document.getElementById('manualEditBtn');
    const aiEditBtn = document.getElementById('aiEditBtn');
    const deleteContentBtn = document.getElementById('deleteContentBtn');
    const saveManualEditBtn = document.getElementById('saveManualEditBtn');
    const applyAiEditBtn = document.getElementById('applyAiEditBtn');

    if (copyContentBtn) copyContentBtn.addEventListener('click', copyCurrentContent);
    if (manualEditBtn) manualEditBtn.addEventListener('click', openManualEdit);
    if (aiEditBtn) aiEditBtn.addEventListener('click', openAiEdit);
    if (deleteContentBtn) deleteContentBtn.addEventListener('click', deleteCurrentContent);
    if (saveManualEditBtn) saveManualEditBtn.addEventListener('click', saveManualEdit);
    if (applyAiEditBtn) applyAiEditBtn.addEventListener('click', applyAiEdit);
}

// ========================================
// SIDEBAR COLLAPSE (Claude-like)
// ========================================

function toggleSidebarCollapse() {
    mainApp.classList.toggle('sidebar-collapsed');
    const isCollapsed = mainApp.classList.contains('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', isCollapsed);
}

// Load sidebar state on init
window.addEventListener('load', () => {
    const savedCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (savedCollapsed) {
        mainApp.classList.add('sidebar-collapsed');
    }
});

// ========================================
// AUTH HANDLERS
// ========================================

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        errorEl.textContent = 'Giriş başarısız: ' + error.message;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const errorEl = document.getElementById('registerError');

    if (password !== passwordConfirm) {
        errorEl.textContent = 'Şifreler eşleşmiyor!';
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = 'Şifre en az 6 karakter olmalı!';
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        errorEl.textContent = 'Kayıt başarısız: ' + error.message;
    }
}

async function handleGoogleSignIn() {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error('Google Sign-In error:', error);
        showToast('Google ile giriş başarısız', 'error');
    }
}

// ========================================
// CHAT SEARCH & FILTER
// ========================================

function filterChats() {
    const searchTerm = chatSearchInput.value.toLowerCase().trim();
    
    document.querySelectorAll('.chat-item').forEach(item => {
        const title = item.querySelector('.chat-item-title').textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// ========================================
// TITLE EDITING
// ========================================

function enableTitleEdit() {
    if (!currentChatId) return;
    
    chatTitle.contentEditable = 'true';
    chatTitle.focus();
    
    const range = document.createRange();
    range.selectNodeContents(chatTitle);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

async function saveTitleEdit() {
    if (!currentChatId || chatTitle.contentEditable === 'false') return;
    
    chatTitle.contentEditable = 'false';
    const newTitle = chatTitle.textContent.trim();
    
    if (!newTitle) {
        chatTitle.textContent = 'Yeni Sohbet';
        return;
    }
    
    try {
        const chatRef = doc(db, 'chats', currentChatId);
        await updateDoc(chatRef, {
            title: newTitle,
            updatedAt: serverTimestamp()
        });
        
        const chatItem = document.querySelector(`.chat-item[data-id="${currentChatId}"]`);
        if (chatItem) {
            chatItem.querySelector('.chat-item-title').textContent = newTitle;
        }
        
        showToast('Başlık güncellendi', 'success');
    } catch (error) {
        console.error('Title update error:', error);
        showToast('Başlık güncellenemedi', 'error');
    }
}

// ========================================
// CHAT FUNCTIONS
// ========================================

async function loadChats() {
    try {
        const chatsRef = collection(db, 'chats');
        const q = query(
            chatsRef,
            where('userId', '==', currentUser.uid),
            orderBy('updatedAt', 'desc')
        );

        onSnapshot(q, (snapshot) => {
            allChats = [];
            chatList.innerHTML = '';

            snapshot.forEach((doc) => {
                const chatData = { id: doc.id, ...doc.data() };
                allChats.push(chatData);
                
                const chatItem = createChatItem(chatData);
                chatList.appendChild(chatItem);
            });

            if (allChats.length === 0) {
                createNewChat();
            } else if (!currentChatId) {
                loadChat(allChats[0].id);
            }
        });
    } catch (error) {
        console.error('Load chats error:', error);
        showToast('Sohbetler yüklenemedi', 'error');
    }
}

function createChatItem(chatData) {
    const item = document.createElement('div');
    item.className = 'chat-item';
    item.dataset.id = chatData.id;
    
    if (chatData.id === currentChatId) {
        item.classList.add('active');
    }

    item.innerHTML = `
        <span class="chat-item-title">${chatData.title || 'Yeni Sohbet'}</span>
        <button class="chat-item-delete" title="Sil">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
    `;

    item.addEventListener('click', (e) => {
        if (!e.target.closest('.chat-item-delete')) {
            loadChat(chatData.id);
        }
    });

    const deleteBtn = item.querySelector('.chat-item-delete');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chatData.id);
    });

    return item;
}

async function createNewChat() {
    try {
        showInlineLoading();
        
        const chatData = {
            userId: currentUser.uid,
            title: 'Yeni Sohbet',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const chatRef = await addDoc(collection(db, 'chats'), chatData);
        
        hideInlineLoading();
        loadChat(chatRef.id);
    } catch (error) {
        hideInlineLoading();
        console.error('Create chat error:', error);
        showToast('Sohbet oluşturulamadı', 'error');
    }
}

async function loadChat(chatId) {
    try {
        currentChatId = chatId;
        contentCache.clear();
        
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.toggle('active', item.dataset.id === chatId);
        });

        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        if (chatDoc.exists()) {
            const chatData = chatDoc.data();
            chatTitle.textContent = chatData.title || 'Yeni Sohbet';
            chatTitle.contentEditable = 'false';
        }

        await loadContents(chatId);
        
    } catch (error) {
        console.error('Load chat error:', error);
        showToast('Sohbet yüklenemedi', 'error');
    }
}

async function loadContents(chatId) {
    try {
        const contentsRef = collection(db, 'contents');
        const q = query(
            contentsRef,
            where('chatId', '==', chatId),
            orderBy('createdAt', 'asc')
        );

        const snapshot = await getDocs(q);
        
        contentGrid.innerHTML = '';
        contentCache.clear();
        
        if (snapshot.empty) {
            welcomeScreen.style.display = 'block';
        } else {
            welcomeScreen.style.display = 'none';
            
            snapshot.forEach((doc) => {
                const contentData = { id: doc.id, ...doc.data() };
                contentCache.set(doc.id, contentData);
                
                const card = createContentCard(contentData);
                
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.card-action-btn')) {
                        showContentDetail(contentData);
                    }
                });
                
                contentGrid.appendChild(card);
            });

            // Initialize diagrams and charts
            setTimeout(() => {
                initMermaidDiagrams();
                initCharts();
            }, 100);
        }
    } catch (error) {
        console.error('Load contents error:', error);
        showToast('İçerikler yüklenemedi', 'error');
    }
}

async function deleteChat(chatId) {
    if (!confirm('Bu sohbeti silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        showInlineLoading();

        const contentsRef = collection(db, 'contents');
        const q = query(contentsRef, where('chatId', '==', chatId));
        const snapshot = await getDocs(q);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        await deleteDoc(doc(db, 'chats', chatId));

        hideInlineLoading();
        showToast('Sohbet silindi', 'success');

        if (currentChatId === chatId) {
            currentChatId = null;
            if (allChats.length > 1) {
                const nextChat = allChats.find(c => c.id !== chatId);
                if (nextChat) loadChat(nextChat.id);
            } else {
                createNewChat();
            }
        }
    } catch (error) {
        hideInlineLoading();
        console.error('Delete chat error:', error);
        showToast('Sohbet silinemedi', 'error');
    }
}

// ========================================
// CONTENT FUNCTIONS
// ========================================

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !currentChatId) return;

    try {
        showInlineLoading();
        messageInput.value = '';
        messageInput.style.height = 'auto';

        const result = await generateContent(message, currentContentType);

        const contentData = {
            chatId: currentChatId,
            userId: currentUser.uid,
            type: result.type,
            content: result.content,
            prompt: message,
            model: result.model,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'contents'), contentData);

        const chatDoc = await getDoc(doc(db, 'chats', currentChatId));
        if (chatDoc.exists() && chatDoc.data().title === 'Yeni Sohbet') {
            const title = await generateTitle(message);
            await updateDoc(doc(db, 'chats', currentChatId), {
                title,
                updatedAt: serverTimestamp()
            });
            chatTitle.textContent = title;
        }

        await updateDoc(doc(db, 'chats', currentChatId), {
            updatedAt: serverTimestamp()
        });

        await loadContents(currentChatId);

        hideInlineLoading();
        currentContentType = 'auto';
        updateSelectedType();

    } catch (error) {
        hideInlineLoading();
        console.error('Send message error:', error);
        showToast('Mesaj gönderilemedi: ' + error.message, 'error');
    }
}

function showContentDetail(contentData) {
    currentEditingContentId = contentData.id;
    
    const config = getTypeConfig(contentData.type);
    document.getElementById('detailTitle').textContent = config.label;
    
    const detailBody = document.getElementById('detailBody');
    detailBody.innerHTML = renderContent(contentData.content, contentData.type, contentData.id);
    
    detailModal.classList.add('active');
    
    setTimeout(() => {
        initMermaidDiagrams();
        initCharts();
    }, 100);
}

function copyCurrentContent() {
    if (!currentEditingContentId) return;
    
    const contentData = contentCache.get(currentEditingContentId);
    if (contentData) {
        copyToClipboard(contentData.content);
    }
}

function openManualEdit() {
    const contentData = contentCache.get(currentEditingContentId);
    if (!contentData) return;
    
    document.getElementById('manualEditTextarea').value = contentData.content;
    detailModal.classList.remove('active');
    manualEditModal.classList.add('active');
}

async function saveManualEdit() {
    if (!currentEditingContentId) return;
    
    const newContent = document.getElementById('manualEditTextarea').value.trim();
    if (!newContent) {
        showToast('İçerik boş olamaz', 'error');
        return;
    }

    try {
        showInlineLoading();
        
        await updateDoc(doc(db, 'contents', currentEditingContentId), {
            content: newContent
        });

        manualEditModal.classList.remove('active');
        await loadContents(currentChatId);
        
        hideInlineLoading();
        showToast('İçerik güncellendi', 'success');
        
    } catch (error) {
        hideInlineLoading();
        console.error('Manual edit error:', error);
        showToast('Güncelleme başarısız', 'error');
    }
}

function openAiEdit() {
    detailModal.classList.remove('active');
    aiEditModal.classList.add('active');
}

async function applyAiEdit() {
    if (!currentEditingContentId) return;
    
    const editInstruction = document.getElementById('aiEditTextarea').value.trim();
    if (!editInstruction) {
        showToast('Düzenleme talimatı girin', 'error');
        return;
    }

    try {
        showInlineLoading();
        
        const contentData = contentCache.get(currentEditingContentId);
        if (!contentData) {
            throw new Error('İçerik bulunamadı');
        }

        const editedContent = await editContent(
            contentData.content,
            editInstruction,
            contentData.type
        );

        await updateDoc(doc(db, 'contents', currentEditingContentId), {
            content: editedContent
        });

        aiEditModal.classList.remove('active');
        document.getElementById('aiEditTextarea').value = '';
        
        await loadContents(currentChatId);
        
        hideInlineLoading();
        showToast('İçerik güncellendi', 'success');
        
    } catch (error) {
        hideInlineLoading();
        console.error('AI edit error:', error);
        showToast('Düzenleme başarısız: ' + error.message, 'error');
    }
}

async function deleteCurrentContent() {
    if (!currentEditingContentId) return;
    
    if (!confirm('Bu içeriği silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        showInlineLoading();
        
        await deleteDoc(doc(db, 'contents', currentEditingContentId));
        
        detailModal.classList.remove('active');
        await loadContents(currentChatId);
        
        hideInlineLoading();
        showToast('İçerik silindi', 'success');
        
    } catch (error) {
        hideInlineLoading();
        console.error('Delete content error:', error);
        showToast('İçerik silinemedi', 'error');
    }
}

// ========================================
// CHECKBOX HANDLER (Persistent)
// ========================================

function setupCheckboxHandler() {
    window.handleCheckboxChange = async function(checkbox) {
        const contentId = checkbox.dataset.contentId;
        if (!contentId) return;
        
        try {
            const contentData = contentCache.get(contentId);
            if (!contentData) return;
            
            const lines = contentData.content.split('\n');
            const itemIndex = parseInt(checkbox.dataset.itemIndex);
            
            if (lines[itemIndex]) {
                if (checkbox.checked) {
                    lines[itemIndex] = lines[itemIndex].replace('[ ]', '[x]');
                } else {
                    lines[itemIndex] = lines[itemIndex].replace(/\[x\]/i, '[ ]');
                }
                
                const newContent = lines.join('\n');
                
                await updateDoc(doc(db, 'contents', contentId), {
                    content: newContent
                });
                
                contentData.content = newContent;
                contentCache.set(contentId, contentData);
            }
        } catch (error) {
            console.error('Checkbox update error:', error);
            checkbox.checked = !checkbox.checked;
        }
    };
}

// ========================================
// INLINE LOADING (Header)
// ========================================

function showInlineLoading() {
    if (inlineLoading) {
        inlineLoading.style.display = 'flex';
    }
}

function hideInlineLoading() {
    if (inlineLoading) {
        inlineLoading.style.display = 'none';
    }
}

// ========================================
// UI HELPERS
// ========================================

function updateSelectedType() {
    const selectedType = document.getElementById('selectedType');
    if (currentContentType === 'auto') {
        selectedType.style.display = 'none';
    } else {
        const config = getTypeConfig(currentContentType);
        selectedType.style.display = 'flex';
        selectedType.innerHTML = `${config.icon} ${config.label}`;
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.dataset.theme = savedTheme;
}

console.log('✅ Ultra Modern Main App loaded');
