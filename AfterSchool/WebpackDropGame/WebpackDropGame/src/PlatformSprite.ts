import 'phaser'
import { GameOption } from './Data/GameOptions'
import Graphics = Phaser.GameObjects.Graphics;
import TileSprite = Phaser.GameObjects.TileSprite;

export default class PlatformSprite extends Phaser.GameObjects.RenderTexture
{
    body:Phaser.Physics.Arcade.Body;
    assignedVelocity:number=0;
    canLandOnIt:boolean = false; // 여기 착지 가능한가
    isHeroOnIt:boolean = false; // 플레이어가 이 위에 있나

    constructor(scene:Phaser.Scene, x:number, y:number, width:number, height:number)
    {
        super(scene, x, y, width, height);
        this.setOrigin(0.5, 0.5);
        scene.add.existing(this);
        scene.physics.add.existing(this);

    }

    setPhysics():void
    {
        this.body.setImmovable(true); // 움직임 X
        this.body.setAllowGravity(false); // 중력 적용 X
    }

    drawTexture(border:Graphics, pattern:TileSprite, eyes:Phaser.GameObjects.Sprite):void
    {
        border.clear();
        border.lineStyle(8, 0x000, 1); // 두께, 색상, 투명도
        border.strokeRect(0, 0, this.displayWidth, this.displayHeight);

        this.draw(pattern, this.displayWidth*0.5,
            Phaser.Math.Between(0, GameOption.platformHeight));
        
        this.draw(eyes, this.displayWidth*0.5, this.displayHeight*0.5);
        this.draw(border);
    }

    transformTo(x:number, y:number, width:number, height:number):void
    {
        this.x= x;
        this.y = y;
        this.setSize(width, height);
        this.body.setSize(width, height);
    }

    explodeAndDestroy(emitter:Phaser.GameObjects.Particles.ParticleEmitter):void
    {
        let bound :Phaser.Geom.Rectangle = this.getBounds();
        emitter.setPosition(bound.left, bound.top);
        emitter.active = true;
        emitter.setEmitZone({
            source:new Phaser.Geom.Rectangle(0, 0, bound.width, bound.height),
            type:'random',
            quantity:50
        })

        emitter.explode(50, 
             this.x-this.displayWidth*0.5,
             this.y-this.displayHeight*0.5);

        this.clearTint();
        this.isHeroOnIt =false;
        this.canLandOnIt=false;
    }
}