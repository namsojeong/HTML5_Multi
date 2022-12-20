import { use } from "matter";
import { ScaleModes } from "phaser";
import { Socket } from "socket.io-client";
import SocketManager from "../Core/SocketManager";
import PlayerAttack from "../GameObjects/PlayerAttack";
import ProjectilePool from "../GameObjects/Pools/ProjectilePool";
import LobbyScene from "../Scenes/LobbyScene";
import PlayGameScene from "../Scenes/PlayGameScene";
import RoomManager from "../Server/RoomManager";
import Session from "../Server/Session";
import { ChangeTeam, DeadInfo, HitInfo, Iceball, MsgBox, PlayerList, Position, ReviveInfo, RoomInfo, RoomReady, SessionInfo, UserInfo } from "./Protocol";

export const addClientLobbyListener = (socket: Socket, scene: LobbyScene) => {
socket.on("msgbox", data=>{
    let msgBox = data as MsgBox;
    alert(msgBox.msg);
})

    socket.on("login_confirm", data => {
        // 로비로 보내기
        let userInfo = data as UserInfo;
        SocketManager.Instance.setName(userInfo.name); // 서버로부터 확인 받은 내 이름을 넣어주고
        scene.gotoLobby(userInfo.name);

        socket.emit("room_list", {});
    });


    socket.on("enter_room", data=>{
        let roomInfo = data as RoomInfo;
        
        scene.goToRoom(roomInfo);
    });

    socket.on("room_list", data=>{
        let list = data as RoomInfo[];
        scene.drawRoomList(list); // 이건 없는거라 에러나는게 맞음
     });

     socket.on("confirm_team", data=>{
        let ct = data as ChangeTeam;
        scene.changeTeam(ct);
     })

     socket.on("new_user", data=>{
        let user = data as UserInfo;
        scene.addRoomUser(user);
    });

    socket.on("user_ready", data=>{
        let user = data as UserInfo;
        scene.userReady(user);
    });

    socket.on("leave_user", data=>{
        let user = data as UserInfo;
        scene.removeUser(user);
    });

    socket.on("room_ready", data=>{
        let roomReady = data as RoomReady;
        scene.setRoomReady(roomReady.ready); //시작버튼이 나오거나 사라지도록 세팅
    });
    
    socket.on("goto_lobby", ()=>{
        scene.gotoLobby(SocketManager.Instance.name);
    });
    
    socket.on("leave-owner", data=>{
        scene.gotoLobby(SocketManager.Instance.name);
        socket.emit("room_list");
    });

    socket.on("game_start", data=>{
        let sessionInfo = data as SessionInfo;
        scene.gameStart(sessionInfo);
    });
};

export const addClientGameListener = (socket: Socket, scene: PlayGameScene) => {
    socket.on("position", data => {
        let pos: Position = data as Position;
        scene.onComplateConnection(pos.x, pos.y);
    });

    socket.on("enter_player", data => {
        let info = data as SessionInfo;
        scene.createPlayer(info.position.x, info.position.y, 200, 350, info.id, true);
    });

    //초기 접속시 플레이어 리스트
    socket.on("init_player_list", data => {
        let playerList = data as PlayerList;
        playerList.list.forEach((p: SessionInfo) => {
            if (p.id == socket.id) return;
            scene.createPlayer(p.position.x, p.position.y, 200, 350, p.id, true);
        })
    })

    socket.on("leave_player", data => {
        let playerList = data as SessionInfo;
        scene.removePlayer(data.id);
    });

    socket.on("info_sync", data => {
        let plist = data as PlayerList;

        plist.list.forEach((p: SessionInfo) => {
            if (p.id == socket.id) return;

            scene.remotePlayers[p.id]?.setInfoSync(p);

        })
    });

    socket.on("fire_projectile", data => {
        let iceball = data as Iceball;
        if (iceball.ownerID == socket.id) {
            // 내 캐릭터에서 발사
            scene.player.attack.fireProjectile(iceball);
        }
        else {
            // RemotePlayer 에서 iceball.ownerId 에 속하는 녀석을 찾아서 발사
            scene.remotePlayers[iceball.ownerID].attack.fireProjectile(iceball);
        }
    });

    socket.on("hit_confirm", data => {
        let hitInfo = data as HitInfo;
        // 맞은 투사체를 찾아서 지우기

        ProjectilePool.Instance.searchAndDisable(hitInfo.projectileId, hitInfo.projectileLTPosition)
        if (hitInfo.playerId == socket.id) { // 내가 맞은 거에 대한 처리
            scene.player.removeWating(hitInfo.projectileId); // 피격 대기 제거
            let dirX = hitInfo.projectileLTPosition.x - scene.player.x < 0 ? 1 : -1;
            let dirY = hitInfo.projectileLTPosition.y - scene.player.y < 0 ? 1 : -1;

            // 여기서 dir에 맞춰 튕겨나가게 해줘야 함
            scene.player.bounceOff(new Phaser.Math.Vector2(dirX, -1));
            scene.player.takeHit(hitInfo.damage);
        } else {
            let target = scene.remotePlayers[hitInfo.playerId];
            if (target == undefined) return;

            target.removeWating(hitInfo.projectileId);
            target.takeHit(hitInfo.damage);
        }

    });

    socket.on("player_dead", data => {
        let info = data as DeadInfo;

        scene.remotePlayers[info.playerId].setActive(false);
        scene.remotePlayers[info.playerId].setVisible(false);
    });

    socket.on("player_revive", data => {
        let reviveInfo = data as ReviveInfo;
        console.log(`${reviveInfo.playerId}님이 개같이 부활`);
    });
};