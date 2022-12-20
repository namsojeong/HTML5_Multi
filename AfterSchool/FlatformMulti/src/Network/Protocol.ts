import { SessionTeam } from "../Server/Session";

export interface Position 
{
    x:number;
    y:number;
}

export interface SessionInfo
{
    id:string;
    name:string;
    position:Position;
    filpX:boolean;
    isMoving:boolean;
    team?:SessionTeam;
}

export interface PlayerList
{
    list:SessionInfo[];
}

export interface Iceball
{
    ownerID:string;
    projectileId:number;
    position:Position;
    direction:number;
    velocity:number;
    lifeTime:number;
    damage:number;
}

export interface HitInfo
{
    projectileId:number; // 피격당한 피사체의 id
    playerId:string; // 투사체에 맞은 플레이어의 id
    projectileLTPosition:Position; // left-top 위치
    damage:number;
}

// 플레이어 크기는 32X38, 투사체 크기는 20X20

export interface DeadInfo
{
    playerId:string;

}

export interface ReviveInfo
{
    playerId:string;
    info:SessionInfo;
}

export interface UserInfo
{
    name:string;
    playerId:string;
    team?:SessionTeam;
    isReady?:boolean;

}

export interface CreateRoom
{
    name:string;
    playerId:string;
}

export interface EnterRoom{
    roomNo:number;
}

export interface RoomInfo
{
    userList:UserInfo[];
    no:number;
    name:string;
    userCnt:number;
    maxCnt:number;
    isPlaying:boolean;
    ownerId:string;
}

export interface MsgBox
{
    msg:string;
}

export interface ChangeTeam
{
    playerID:string;
    team:SessionTeam; // 변경하고자 하는 팀
}

export interface RoomReady
{
    ready:boolean;
}