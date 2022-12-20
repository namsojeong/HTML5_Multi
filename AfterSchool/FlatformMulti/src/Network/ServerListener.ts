import { Socket } from "socket.io";
import Room from "../Server/Room";
import RoomManager from "../Server/RoomManager";
import ServerMapManager from "../Server/ServerMapManager";
import Session, { SessionStatus, SessionTeam } from "../Server/Session";
import SessionManager from "../Server/SessionManager";
import { SessionInfo, PlayerList, Iceball, HitInfo, DeadInfo, ReviveInfo, UserInfo, CreateRoom, EnterRoom, MsgBox, ChangeTeam } from "./Protocol";

//서버에서 소켓이 리스닝해야하는 이벤트를 여기서 다 등록
export const addServerListener = (socket: Socket, session: Session) => {

   // 로비 리스너
   socket.on("login_user", data=>{
      if(session.status == SessionStatus.CONNECTED)
      {
         let userInfo= data as UserInfo;
         session.setName(userInfo.name);
   
         session.status = SessionStatus.LOBBY; // 로비에 들어간 것으로 변경
         socket.emit("login_confirm", userInfo);
      }
      
   });

   socket.on("create_room", data=>{
      let {name, playerId} = data as CreateRoom;

      let room = RoomManager.Instance.createRoom(name);
      room.ownerID = playerId;
      room.enterRoom(session);
      // 룸을 만들고 해당 룸에 세션을 들여보내고 해당 룸의 주인으로 만든다.

      // 클라이언트한테 니가 이 방에 들어왔어 라는 걸 알려줘야해
      socket.emit("enter_room", room.serialize());
   });

   socket.on("room_list", data=>{
      socket.emit("room_list", RoomManager.Instance.getAllRoomInfo());
   });

   socket.on("request_team", data=>{ 
      let changeTeam = data as ChangeTeam;
      if(session.status != SessionStatus.INRROM)
      {
         socket.emit("msgbox", {msg:"올바르지 않은 접근입니다."});
         return;
      }
      if(session.isReady)
      {
         socket.emit("msgbox", {msg:"레디 상태에서는 안됩니다."});
         return;
      }
      session.team = changeTeam.team; // 팀 변경시키고 방에 있는 모두에게 브로드캐스트
      session.room?.broadcast("confirm_team", changeTeam, "none");
   });

   socket.on("user_ready", data=>{
      let userInfo = data as UserInfo;
      if(session.team !=SessionTeam.NONE)
      {
         session.isReady = !session.isReady; // 토글 시키는 걸로
         userInfo.isReady = session.isReady; // 토글된 정보 갱신
         session.room?.broadcast("user_ready", userInfo, session.id); // 재전송 (본인포함)

         let room = session.room as Room;
         room.sessionMap[room.ownerID].send("room_ready", {ready:room.checkAllReady()});
         
      }
      else
      {
         socket.emit("msgbox", {msg:"팀을 먼저 선택해야 합니다."});
         return;
      }
   });

   socket.on("leave_room", data=>{
      if(session.room!=null){
         RoomManager.Instance.leaveRoom(session);
      }

      socket.emit("goto_lobby", {});
      socket.emit("room_list", RoomManager.Instance.getAllRoomInfo());
   });

   socket.on("start_room", ()=>{
      if(session.room == null || session.room.checkAllReady() == false){
         let msg:MsgBox = {msg:"모든 구성원이 준비되지 않았습니다."};
         socket.emit("msgbox", msg);
         return;
      }

      // 여기까지 왔다면 모든 플레이어가 팀을 선택하고 준비된 상태
      session.room.startGame(); // 해당 방이 게임 시작하도록 변경한다.

   });

   // 이 아래쪽은 게임 프로토콜 관련 리스너
   socket.on("enter", data => {
      let pos = ServerMapManager.Instance.getRandomSpawnPosition();
      socket.emit("position", pos);
      session.setName(data.name);
      session.setPosition(pos);

      //접속한 소켓에는 init_player_list 메세지를 보낼거고
      /*
          세션메니저에있는 map의 모든 정보를 보내준다. 누구에게? 세션에게
      */
      let list = SessionManager.Instance.getAllSessionInfo();
      session.send("init_player_list", { list });

      //다른 모든 소켓에는 enter_player,SessionInfo와 함께보낼게요
      //지금 들어온 소켓은 받지 않는다.
      SessionManager.Instance.broadcast("enter_player", session.getSesstionInfo(), socket.id, true);
   });

   
   socket.on("enter_room", data=>{
      let enterRoom = data as EnterRoom;
      let room = RoomManager.Instance.getRoom(enterRoom.roomNo);
      let msg:MsgBox = {msg:"존재하지 않는 방입니다."};
      if(room == null)
      {
         socket.emit("msgbox", {msg});
      }
      else{
         let result =  room.enterRoom(session);
         if(result == false)
         {
          msg.msg = "더이상 방에 자리가 없습니다. 새로고침하세요";
          socket.emit("msgbox", msg);  
         }
         else
         {
            let newUser : UserInfo = session.getUserInfo();
            room.broadcast("new_user", newUser, session.id, true); // 새로운 유저가 왔음을 다른 유저에게 안내
            socket.emit("enter_room", room.serialize());
         }
      }
   });

   socket.on("info_sync", data => {
      let info = data as SessionInfo;

      //해당 세션이 존재하면 인포 셋팅한다.
      SessionManager.Instance.getSession(info.id)?.setInfo(info);
   });

   let projectileId: number = 0;

   socket.on("fire_attempt", data => {
      let iceball = data as Iceball;
      projectileId++;
      iceball.projectileId = projectileId; // 숫자 지정 후 보내준다.

      SessionManager.Instance.broadcast("fire_projectile", iceball, socket.id, false); // 요청한 사용자도 같이 받게
   });

   socket.on("hit_report", data => {
      let hitInfo = data as HitInfo;

      let session = SessionManager.Instance.getSession(hitInfo.playerId);
      if (session == undefined) return;

      let { x, y } = session.position;
      let sLTPos = { x: x - 32, y: y - 38 }; // 플레이어의 좌측 상단 좌표
      let iLTPos = hitInfo.projectileLTPosition;

      let verify: boolean = (sLTPos.x < iLTPos.x + 20)
         && (sLTPos.y < iLTPos.y + 20)
         && (sLTPos.x + 32 + 32 * 0.5 > iLTPos.x)
         && (sLTPos.y + 38 + 38 * 0.5 > iLTPos.y);

      if (verify == false) return;

      SessionManager.Instance.broadcast("hit_confirm", hitInfo, socket.id, false);
   });

   socket.on("disconnect", (reason: string) => {
      SessionManager.Instance.removeSession(socket.id);
      console.log(`${session.name} ( ${socket.id} ) is disconnected`);

      //여기서 접속한 모든 사용자에게 해당 유저가 떠났음을 알려줘야 한다.
      if(session.room !=null){
         session.room.broadcast("leave_player", session.getSesstionInfo(), socket.id, true);
      }
      SessionManager.Instance.broadcast("leave_player", session.getSesstionInfo(), socket.id, true);
   });

   socket.on("player_dead", data=>{
      let deadInfo = data as DeadInfo;
      SessionManager.Instance.broadcast("player_dead", deadInfo, socket.id, true); // 센더는 안받는다

      // 여기에는 부활로직
      // 사망횟수에 따라 부활 시간도 증가하게 설계

      // 5초후 부활 메세지 브로드캐스팅
      setTimeout(()=>{
         let pos = ServerMapManager.Instance.getRandomSpawnPosition();
         session.setPosition(pos); // 포지션 리셋 외에도 다양한 리셋정보들을 리셋

         let reviveInfo :ReviveInfo ={playerId:deadInfo.playerId, info:session.getSesstionInfo()};
         SessionManager.Instance.broadcast("player_revive", reviveInfo, socket.id, false); 
      }, 1000*5);
   });


   //클라이언트가 disconnection되며누 
   //leave_player 라는 메세지와 함께 sessioninfo가 넘아오도록 민들어
   //그리고 그걸 받은 클라이언트는 removePlayer를 호출
};