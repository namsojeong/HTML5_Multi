import { SessionInfo } from "../Network/Protocol";
import RoomManager from "./RoomManager";
import Session from "./Session";

export interface SessionMap
{
    [key:string] :Session
}

export default class SessionManager
{
    static Instance : SessionManager;
    map :SessionMap = {};

    constructor()
    {

    }

    getSession(key:string):Session | undefined
    {
        return this.map[key];
    }

    addSession(key:string,session:Session):void
    {
        this.map[key] = session;
    }

    removeSession(key:string):void
    {
        let s = this.map[key];
        delete this.map[key];
        if(s.room !=null)  // 룸에 들어가 있었다면 해당 룸에서 내보내기
        {
            RoomManager.Instance.leaveRoom(s);
        }
    }

    broadcast(protocol:string,msgJson:Object,senderKey:string,exceptSender:boolean = false):void
    {
        for(let key in this.map)
        {
            if(key == senderKey && exceptSender == true) continue;
            this.map[key].send(protocol,msgJson);
        }
    }

    getAllSessionInfo():SessionInfo[]
    {
        let list:SessionInfo[] = [];
        //이부분을
        for(let key in this.map)
        {
            list.push(this.map[key].getSesstionInfo());
        }

        return list;
    }
}