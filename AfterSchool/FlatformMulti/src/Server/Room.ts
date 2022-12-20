import { RoomInfo, UserInfo } from "../Network/Protocol";
import { RoomStatus } from "./RoomManager";
import Session, { SessionStatus } from "./Session";
import SessionManager, { SessionMap } from "./SessionManager";

export default class Room {
    roomNo: number;
    sessionMap: SessionMap = {};
    status: RoomStatus = RoomStatus.IDLE;

    count: number = 0;
    maxCount: number = 4;
    name: string;

    ownerID: string; // 방장의 id

    // 나중에 룸 고유의 타이머도 가지고 있어야 한다.
    constructor(name: string, roomNo: number) {
        this.roomNo = roomNo;
        this.name = name;
    }

    enterRoom(session: Session): boolean {
        if (this.count >= this.maxCount) return false;
        this.sessionMap[session.id] = session;
        session.setRoom(this);
        session.status = SessionStatus.INRROM;
        this.count++;
        return true;
    }

    leaveRoom(socketID: string): void {
        this.sessionMap[socketID].resetToLobby();
        this.count--; // 한명 감소
        // 방에 있는 모든 클라에 leave_room 이라는 메세지를 보내야 해

        let leaveUserInfo = this.sessionMap[socketID].getUserInfo();
        delete this.sessionMap[socketID]; // 제거하고

        if (socketID == this.ownerID) // 방장이 나갔다면 방 폭파하고 모두 내보내기
        {
            console.log(`방장이 나갔습니다. ${this.roomNo}를 폐쇄합니다.`);
            this.count = 0;
            this.KickAllUser();
        } else {
            this.broadcast("leave_user", leaveUserInfo, socketID);
            this.sessionMap[this.ownerID].send("room_ready", { ready: this.checkAllReady() });
            //방장에게는 방의 레디정보 변경에 따른 정보를 보내줘야 함
        }
    }

    KickAllUser(): void {
        this.broadcast("leave-owner", {}, "none");
        for (let key in this.sessionMap) {
            this.sessionMap[key].resetToLobby();
        }
        this.sessionMap = {};
        this.count = 0;
    }

    broadcast(protocol: string, msg: object, sender: string, exceptSender: boolean = false): void {
        for (let key in this.sessionMap) {
            if (key == sender && exceptSender) continue;
            this.sessionMap[key].send(protocol, msg);
        }
    }

    getUserList(): UserInfo[] {
        let list: UserInfo[] = [];
        for (let key in this.sessionMap) {
            let s = this.sessionMap[key];
            list.push(s.getUserInfo());
        }
        return list;
    }

    serialize(): RoomInfo {
        let info: RoomInfo = {
            userList: this.getUserList(),
            name: this.name,
            userCnt: this.count,
            maxCnt: this.maxCount,
            isPlaying: this.status == RoomStatus.RUNNING,
            no: this.roomNo,
            ownerId: this.ownerID
        };

        return info;
    }

    checkAllReady(): boolean {
        // 양팀의 선수가 다 있어야 레디
        let isReady: boolean = true;
        for (let key in this.sessionMap) {
            if (this.sessionMap[key].isReady == false) {
                isReady = true;
                break;
            }
        }
        return isReady;
    }

    startGame(): void {
        this.status = RoomStatus.RUNNING;
        // 방 안에 있는 모든 우저의 상태를 게임 플레이로 변경하고
        // 모든 유저에게 브로드캐스트로 게임 시작 알리기
        for (let key in this.sessionMap) {
            this.sessionMap[key].status = SessionStatus.PLAYING;
            // 팀정보를 비롯한 세션정보를 클라가 받게 보내줌
            this.sessionMap[key].send("game_start", this.sessionMap[key].getSesstionInfo());
        }
    }
}