// Mock Firebase replacement using Local Storage
export const OperationType = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
});

export const handleFirestoreError = (error, type, path) => {
  console.error(`MockDB Error (${type}) on path ${path}:`, error);
  throw error;
};

// Simple EventEmitter for onSnapshot-like behavior
const listeners = {};

export const mockDB = {
  get: (path) => {
    const data = localStorage.getItem(`db_${path}`);
    return data ? JSON.parse(data) : null;
  },
  
  set: (path, value) => {
    localStorage.setItem(`db_${path}`, JSON.stringify(value));
    notify(path);
  },
  
  delete: (path) => {
    localStorage.removeItem(`db_${path}`);
    notify(path);
  },
  
  list: (collectionPath) => {
    const prefix = `db_${collectionPath}/`;
    const keys = Object.keys(localStorage).filter(k => {
      if (!k.startsWith(prefix)) return false;
      const rest = k.substring(prefix.length);
      return !rest.includes('/');
    });
    return keys
      .map(k => JSON.parse(localStorage.getItem(k)))
      .filter(item => item && item.is_deleted !== 1 && item.is_deleted !== true && item.isDeleted !== true);
  },
  
  subscribe: (path, callback) => {
    if (!listeners[path]) listeners[path] = [];
    listeners[path].push(callback);
    
    // Initial call: Heuristic - even number of parts usually means document, odd means collection
    const parts = path.split('/').filter(p => p.length > 0);
    if (parts.length > 0 && parts.length % 2 === 0) {
      callback(mockDB.get(path));
    } else {
      callback(mockDB.list(path));
    }
    
    return () => {
      listeners[path] = listeners[path].filter(l => l !== callback);
    };
  }
};

const notify = (path) => {
  // Notify exact path
  if (listeners[path]) {
    const data = mockDB.get(path);
    listeners[path].forEach(l => l(data));
  }
  
  // Notify parent collection if item changed
  const parts = path.split('/').filter(p => p.length > 0);
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join('/');
    if (listeners[parentPath]) {
      const list = mockDB.list(parentPath);
      listeners[parentPath].forEach(l => l(list));
    }
  }
};

// Mock Auth
let currentUser = null;
const authListeners = [];

// Initialize session from localStorage
const savedUser = localStorage.getItem('auth_session');
if (savedUser) {
  currentUser = JSON.parse(savedUser);
}

export const auth = {
  get currentUser() { return currentUser; },
  onAuthStateChanged: (callback) => {
    authListeners.push(callback);
    callback(currentUser);
    return () => {
      const idx = authListeners.indexOf(callback);
      if (idx > -1) authListeners.splice(idx, 1);
    };
  },
  signIn: (user) => {
    currentUser = user;
    localStorage.setItem('auth_session', JSON.stringify(user));
    authListeners.forEach(l => l(currentUser));
  },
  signOut: () => {
    currentUser = null;
    localStorage.removeItem('auth_session');
    authListeners.forEach(l => l(null));
  }
};

export const db = mockDB;
export const serverTimestamp = () => new Date().toISOString();
