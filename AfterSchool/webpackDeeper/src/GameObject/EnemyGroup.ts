import Phaser from "phaser";
import GameUtil from "../Core/GameUtil";
import EnemySprite from "./EnemySprite";
import { GameOption } from "../GameOption";
import PlatformGroup from "./PlatformGroup";
import PlatformSprite from "./PlatformSprite";

export default class EnemyGroup extends Phaser.Physics.Arcade.Group
{
    pool: EnemySprite[] = [];

    constructor(world:Phaser.Physics.Arcade.World, scene:Phaser.Scene, pGroup:PlatformGroup)
    {
        super(world, scene);

        scene.physics.add.collider(this, pGroup);

        for(let i=0;i<15;i++)
        {
            //let e = new EnemySprite(this, undefined, this.enemyGroup);
        }
    }

    // 기존 그룹에 있던 녀석을 제거하고 풀로 돌려보낸다.
    groupToPool(e:EnemySprite):void{
        this.remove(e);
        this.pool.push(e);
    }

    // 새로 풀에 있는 적을 가져와서 플랫폼 위에 올린다.
    poolToGroup(p:PlatformSprite) : EnemySprite{
        let e = this.pool.shift() as EnemySprite; // 맨 앞에 한 녀석을 뽑아온다.
        e.platform = p;
        e.x = p.x;
        e.y = p.y-120;
        e.setVisible(true);
        this.add(e); //그룹에 다시 추가

        e.body.setAllowGravity(true);
        e.setVelocityX(GameUtil.Rand(GameOption.patrolSpeed)*Phaser.Math.RND.sign());
        e.anims.play("enemy_run", true);
        e.setFlipY(false);

        return e;
    }
}