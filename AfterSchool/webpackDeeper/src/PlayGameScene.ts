import EnemyGroup from "./GameObject/EnemyGroup";
import EnemySprite from "./GameObject/EnemySprite";
import PlatformGroup from "./GameObject/PlatformGroup";
import PlatformSprite, { PlatformInitOption } from "./GameObject/PlatformSprite";
import PlayerSprite from "./GameObject/PlayerSprite";
import { GameOption } from "./GameOption";
import PlatformSpriteLoader, { SpriteSet } from "./PlatformLoader";

export default class PlayGameScene extends Phaser.Scene {

    player: PlayerSprite;
    background: Phaser.GameObjects.TileSprite;

    leftSprite: Phaser.GameObjects.Sprite;
    rightSprite: Phaser.GameObjects.Sprite;
    middleSprite: Phaser.GameObjects.Sprite;

    platformGroup: PlatformGroup;
    enemyGroup : EnemyGroup;

    constructor() {
        super("PlayGameScene");
    }

    create() {
        this.setBackground();

        let { middleSprite: m, rightSprite: r, leftSprite: l } = PlatformSpriteLoader(this);

        this.platformGroup = new PlatformGroup(this.physics.world, this);
        this.enemyGroup = new EnemyGroup(this.physics.world, this, this.platformGroup); // 적 그룹

        for (let i = 0; i < 10; i++) {
            let option: PlatformInitOption = this.platformGroup.getPlatformInitOption(i == 0);
            let p = new PlatformSprite(this, this.platformGroup, l, r, m, option);
        
            if(i>0){
                this.placeOnPlatform(p);
            }
        }
        this.player = new PlayerSprite(this);
    }

    placeOnPlatform(p:PlatformSprite):void {
        

    }

    handleCollision(body1: Phaser.GameObjects.GameObject, body2: Phaser.GameObjects.GameObject): void {
        let player: PlayerSprite = body1 as PlayerSprite;
        let platform: PlatformSprite = body2 as PlatformSprite;

        console.log("플레이어 착지");
    }

    handleEnemyCollsition(body1: Phaser.GameObjects.GameObject, body2: Phaser.GameObjects.GameObject)
    {
        let player = body1 as PlayerSprite;
        let enemy = body2 as EnemySprite;

        if(player.body.touching.down && enemy.body.touching.up)
        {
            enemy.anims.play("enemy_hit", true);
            this.enemyGroup.groupToPool(enemy); // 그룹에서 빼서 풀에 넣는다.

            this.enemyGroup.remove(enemy);
            enemy.setFlipY(true);
            player.setVelocity(-400);
        }
        else
        {
            this.setGameOver();
        }
    }

    resetPlatform(p: PlatformSprite) {
        let option: PlatformInitOption = this.platformGroup.getPlatformInitOption(false);
        p.init(option);
    }

    startMove(): void {
        this.platformGroup.setVelocityY(-GameOption.platformSpeed);
    }


    update(time: number, delta: number) {
        if (this.player.firstMove) {
            this.background.tilePositionY += 0.2;
        }

        this.physics.world.collide(this.player, this.platformGroup, this.handleCollision, undefined, this);
        this.physics.world.collide(this.player, this.enemyGroup, this.handleEnemyCollsition, undefined, this);

        if(this.player.y>GameOption.gameSize.height ||this.player.y<0)
        {
            this.setGameOver();
        }

        let pList: PlatformSprite[] = this.platformGroup.getChildren() as PlatformSprite[];

        pList.forEach(p => {
            let pBound = p.getBounds(); // 경계 얻기
            if (pBound.bottom < 0) // 화면 위로 올라갔다면?
            {
                this.resetPlatform(p);
            }
        });

        // 적군들의 패트롤링
        let enemies = this.enemyGroup.getChildren() as EnemySprite[];
        enemies.forEach(e=> {
            e.patrol();

            let eBound= e.getBounds();
            if(eBound.bottom<0) // 화면 위로 올라감
            {
                e.setVelocity(0, 0); //정지
                e.body.setAllowGravity(false) //중력 영향 안받게
                this.enemyGroup.groupToPool(e);
                e.setVisible(false);
            }
        });

    }

    setBackground(): void {
        this.background = this.add.tileSprite(
            0, 0,
            GameOption.gameSize.width / GameOption.pixelScale,
            GameOption.gameSize.height / GameOption.pixelScale, 'background');
        this.background.setOrigin(0, 0);
        this.background.scale = GameOption.pixelScale;
    }

    setGameOver():void
    {
        this.scene.start("PlayGameScene");
        this.events.off(Phaser.Scenes.Events.UPDATE);
    }
}