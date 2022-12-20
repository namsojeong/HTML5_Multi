import Http, { Server } from 'http';
import Express, { Application, NextFunction, Request, Response } from "express";
import Path from 'path'
import { ConPool, Score } from './DB';
import { FieldPacket, ResultSetHeader } from 'mysql2';
import Pool from 'mysql2/typings/mysql/lib/Pool';

const App: Application = Express();

App.use(Express.static("public"));
App.use(Express.json());
App.use(Express.urlencoded({extended:true}));

App.all("/*",(req:Request, res:Response, next:NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Method", "POST");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

App.get("/ggm", (req: Request, res: Response) => {
    let filePath: string = Path.join(__dirname, "..", "views", "index.html")
    res.sendFile(filePath);
});

App.get("/test", (req: Request, res: Response) => {
    let filePath: string = Path.join(__dirname, "..", "views", "test.html")
    res.sendFile(filePath);
});

App.get("/record",async (req:Request, res:Response) => {
    let sql = `SELECT * FROM scores ORDER BY level DESC, time LIMIT 0,3`;
    let [rows,fieldInfo]:[Score[],FieldPacket[]] = await ConPool.query(sql);

    res.json({rows,msg:"로딩완료"});
})

App.post("/record", async (req: Request, res: Response) => {
    //let id = "admin";
    //let pass = "1' OR '1";
    //`SELECT * FROM users WHERE id = 'admin' AND pass = '1' OR '1'`
    //XSS 공격
    // <img src=<script src="app.js"></script>/>
    let { username, level } = req.body;
    if (username === undefined || level === undefined) {
        res.json({ msg: "잘못된 요청입니다.", success: false });
        return;
    }

    let sql = "INSERT INTO scores(username, level, time) VALUES (?, ?, NOW())";
    //ConPool.query(sql, ["node", 3]);

    //Sql Injection
    try {
        let [result, error]: [ResultSetHeader, any] = await ConPool.query(sql, [username, level]);
        if (result.affectedRows == 1) {
            res.json({ msg: "성공적으로 기록됨", success: true });
        }
        else {
            res.json({ msg: "DB오류로 기록되지 못함", success: false });
        }
    } catch (e) {
        console.log(e);
        res.json({ msg: "서버 오류 발생!", success: false });
    }

});

// http://gondr.asuscomm.com/phpmyadmin
// yy_20101 ~ 20121
App.get("/gigdc", (req, res) => {
    console.log("대상!");
})

const httpServer: Server = App.listen(9090, () => {
    console.log(`Server is running on 9090 port`);
})