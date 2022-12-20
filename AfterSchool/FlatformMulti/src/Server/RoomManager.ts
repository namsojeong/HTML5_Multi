import { RoomInfo } from "../Network/Protocol";
import Room from "./Room"
import Session, { SessionTeam } from "./Session";


export enum RoomStatus{
    IDLE = 1,
    RUNNING = 2
}

interface Rooms
{
    [key:number]:Room
}

export default class RoomManager
{
    static Instance:RoomManager;

    nextRoomNo = 1;
    roomMap:Rooms={};

    createRoom(name:string):Room{
        let newRoom = new Room(name, this.nextRoomNo);
        this.roomMap[this.nextRoomNo] = newRoom;
        this.nextRoomNo++;
        return newRoom;
    }

    // 룸에서 빠져나가는 것도 얘가 해야 돼.
    leaveRoom(session:Session):void
    {
        let r:Room = session.room as Room;
        r.leaveRoom(session.id);
        session.resetToLobby();
        
        if(r.count==0)
        {
            delete this.roomMap[r.roomNo]; // 해당 룸을 삭제한다.
        }
    }

    // 전체 룸 정보
    getAllRoomInfo():RoomInfo[]
    {
        let list:RoomInfo[] = [];
        for(let key in this.roomMap)
        {
            list.push(this.roomMap[key].serialize());
        }
        return list;
    }

    getRoom(roomNo:number):Room | null{
        if(this.roomMap[roomNo]==undefined)
        return null;
        else
        return this.roomMap[roomNo];
    }
}