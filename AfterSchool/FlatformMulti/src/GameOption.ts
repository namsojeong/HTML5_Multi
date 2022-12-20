const mapwidth:number = 1600;
const gameWidht:number = 1280;
export const GameOption = 
{
    width:1280,
    height:600,
    mapOffset:mapwidth > gameWidht ? mapwidth - gameWidht : 0,
    cameraZoomFator:1.5,
    bottomOffset : 200
}