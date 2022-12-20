const http = require('http');

const server = http.createServer((req, res)=> {
   switch(req.url)
   {
    case "/":
        req.end("Hello world!!");
        break;
    case "/image":
        req.end("image page");
        break;
   }

});

server.listen(9090, ()=>{
    console.log(`서버가 9090 포트에서 구동중입니다.`);
});