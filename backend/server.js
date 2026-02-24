const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Use a simple ID generator since uuid v11 is ESM only
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'server-db.json');

app.use(cors());
app.use(bodyParser.json());

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

// Helper to read data
const readData = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
};

// Helper to write data
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// --- API Endpoints ---

// Root path - API info
app.get('/', (req, res) => {
    res.json({
        message: '饭点 API 服务正常运行中',
        status: 'ok',
        endpoints: {
            'GET /api/lists/:id': '获取指定列表',
            'POST /api/lists': '创建或更新列表',
            'POST /api/lists/:id/join': '加入列表'
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 1. Get a specific list by ID
app.get('/api/lists/:id', (req, res) => {
    const { id } = req.params;
    const db = readData();
    
    if (!db[id]) {
        return res.status(404).json({ error: 'List not found' });
    }
    
    res.json(db[id]);
});

// 2. Create or Update a list (Sync)
app.post('/api/lists', (req, res) => {
    const { id, name, restaurants, users } = req.body;
    const db = readData();
    
    const listId = id || uuidv4();
    
    // If list exists, merge or overwrite? For sync, we usually overwrite with latest state
    // But to be safer, we could implement merging. For hackathon, simple overwrite is fine usually,
    // or better: partial updates.
    
    // Let's assume the client sends the full list state for simplicity in this MVP
    db[listId] = {
        id: listId,
        name: name || (db[listId] ? db[listId].name : '未命名列表'),
        restaurants: restaurants || (db[listId] ? db[listId].restaurants : []),
        users: users || (db[listId] ? db[listId].users : []),
        updatedAt: new Date().toISOString()
    };
    
    writeData(db);
    res.json(db[listId]);
});

// 3. Add a user to a list (Join room)
app.post('/api/lists/:id/join', (req, res) => {
    const { id } = req.params;
    const { userId, userName } = req.body;
    const db = readData();
    
    if (!db[id]) {
        // If joining a non-existent list, maybe create it?
        // Or return error. Let's create it for easier sharing.
        db[id] = {
            id,
            name: '共享列表',
            restaurants: [],
            users: [],
            updatedAt: new Date().toISOString()
        };
    }
    
    const list = db[id];
    const existingUser = list.users.find(u => u.id === userId);
    
    if (!existingUser) {
        list.users.push({ id: userId, name: userName, joinedAt: new Date().toISOString() });
        writeData(db);
    }
    
    res.json(list);
});

app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});
