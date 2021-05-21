const express = require('express');

const app = express();
const port = process.env.PORT;

require('./db/mongoose');

const userRouter = require('./routers/user');
const postRouter = require('./routers/post');

app.use(express.json());
app.use(userRouter);
app.use(postRouter);

app.listen(port, () => {
    console.log("Server is running on "+port);
});