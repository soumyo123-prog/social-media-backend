const express = require('express');

const app = express();
const port = process.env.PORT;

require('./db/mongoose');

const userRouter = require('./routers/user');
const postRouter = require('./routers/post');

app.use(express.json());

// app.use((req,res,next) => {
//     res.header('Access-Control-Allow-Origin','*');
//     res.header('Access-Control-Allow-Headers','*');
//     if (req.method === 'OPTIONS') {
//         res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
//         return res.status(200).send({});
//     }
// })

app.use(userRouter);
app.use(postRouter);

app.listen(port, () => {
    console.log("Server is running on "+port);
});