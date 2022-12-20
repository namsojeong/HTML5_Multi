import Http, {Server} from 'http';
import Express, { Application, NextFunction, Request, Response } from 'express';
import Path from 'path';
import { ConPool, Score } from './DB';
import { FieldPacket, ResultSetHeader } from 'mysql2';
import Pool from 'mysql2/typings/mysql/lib/Pool';

const App : Application = Express();

App.use(Express.static("public"));
App.use(Express.json());
App.use(Express.urlencoded({extended:true}));

App.all("/record", (req:Request, res:Response, next:NextFunction)=>{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Method", "POST");
    res.header("Access-Control-Allow-Headers", "Content-type");
    next();
});

App.get("/ggm", (req:Request, res:Response)=>{
    let filePath:string = Path.join(__dirname,"..","views", "index.html");
    console.log(filePath);
    res.sendFile(filePath);
});
App.get("/test", (req:Request, res:Response)=>{
    let filePath:string = Path.join(__dirname,"..","views", "test.html");
    console.log(filePath);
    res.sendFile(filePath);
});

App.get("/record", async(req:Request, res:Response)=>{
    let sql = `SELECT * FROM scores ORDER BY level DESC, time LIMIT 0, 3`;
    let [rows, fieldInfo] : [Score[], FieldPacket[]] = await ConPool.query(sql);

    res.json({rows, msg:"로딩완료"});
});

App.post("/record", async(req:Request, res:Response)=>{

    // POST로 전송된 애는 body
    // get으로 전송된 애는 query로 들어감
    let {username, level} = req.body;
    if(username===undefined || level=== undefined)
    {
        res.json({msg:"잘못된 요청입니다.", success:false});
        return;
    }
    let sql ="INSERT INTO scores(username, level, time) VALUES (?, ?, NOW())";

    try{

        let [result, error] : [ResultSetHeader, any] = await ConPool.query(sql, [username, level]);
        if(result.affectedRows == 1)
        {
            res.json({msg:"성공적으로 기록됨", success:true});
        }
        else
        {
            res.json({msg:"DB오류로 기록되지 못함", success:false});
        }
    }
    catch(e)
    {
        console.log(e);
        res.json({msg:"서버 오류 발생", success:false});
    }
});

const httpServer : Server =Http.createServer(App);
httpServer.listen(9090, ()=>{
    console.log(`Server is running on 9090 port`);
});

// const httpServer : Server = App.listen(9090, ()=>{
//     console.log(`Server is running on 9090 port`);
// });