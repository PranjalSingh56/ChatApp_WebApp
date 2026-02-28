# 💬 ChatApp – Phone Number Based Chat Application (MERN)

A real-time chat web application built using the MERN stack that allows users to communicate securely using phone number–based authentication.

---

## 🚀 Features

- Phone number–based user authentication  
- OTP-based secure login  
- Real-time one-to-one chat  
- Message timestamps and chat history  
- RESTful APIs for users and messages  
- MongoDB database for storing users and chats  
- Fully responsive user interface  

---

## 🛠️ Tech Stack

### Frontend
- React.js
- JavaScript
- HTML5
- CSS3

### Backend
- Node.js
- Express.js
- REST APIs

### Database
- MongoDB
- Mongoose

### Real-Time Communication
- Socket.IO (if used)

---

## 📂 Project Structure

ChatApp/
│
├── client/          # React frontend
│   ├── src/
│   └── package.json
│
├── server/          # Node.js backend
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── server.js
│
└── README.md

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

git clone https://github.com/your-username/chatapp.git  
cd chatapp  

---

### 2️⃣ Backend Setup

cd server  
npm install  

Create a `.env` file inside the `server` folder:

PORT=5000  
MONGO_URI=your_mongodb_connection_string  
JWT_SECRET=your_secret_key  

Start the backend server:

npm start  

---

### 3️⃣ Frontend Setup

cd client  
npm install  
npm run dev  

---

## 🔄 API Endpoints (Sample)

- POST /api/auth/signup – Register user using phone number  
- POST /api/auth/login – Login user  
- GET /api/chats – Fetch user chats  
- POST /api/messages – Send a message  

---

## 🧠 Future Enhancements

- Group chats  
- File and image sharing  
- Typing indicators and read receipts  
- Online/offline user status  
- Cloud deployment (Vercel / Render / AWS)

---

## 🤝 Contributing

Contributions are welcome.  
Fork the repository and submit a pull request.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙌 Author

Pranjal Singh  
Full Stack Developer (MERN)

---

⭐ If you like this project, don’t forget to star the repository!
