
import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import App from './App';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBmIIoGgIZ9tCgegIkQTXHL7bO-uGLIEIw",
  authDomain: "veo3-new.firebaseapp.com",
  projectId: "veo3-new",
  storageBucket: "veo3-new.firebasestorage.app",
  messagingSenderId: "471600644818",
  appId: "1:471600644818:web:fbd8319ca2364ac898e30b",
  measurementId: "G-QKE0DMWTBC"
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
