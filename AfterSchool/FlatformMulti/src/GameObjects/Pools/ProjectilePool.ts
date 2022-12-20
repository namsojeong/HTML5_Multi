import Phaser from "phaser";
import Projectile from "../Projectile";
import { Position } from "../../Network/Protocol";

export default class ProjectilePool extends Phaser.Physics.Arcade.Group
{
    static Instance:ProjectilePool;

    pool: Projectile[];

    constructor(scene:Phaser.Scene)
    {
        super(scene.physics.world,scene);

        this.pool = this.createMultiple({
            classType:Projectile,
            frameQuantity:10,
            active:false,
            visible:false,
            key:'iceball',

        }) as Projectile[];

        this.pool.forEach(x => x.body.setAllowGravity(false));
    }

    getProjectile():Projectile
    {
        let p = this.getFirstDead(false) as Projectile;

        if(p == null)
        {
            p=new Projectile(this.scene, 0, 0, 'iceball');
            this.add(p);
            this.pool.push(p);
            p.body.setAllowGravity(false);
        }else{
            p.setActive(true);
            p.setVisible(true);
        }

        return p;
    }

    // 나중에 저 위치에다가 impact 이펙트를 재생하기 위해서
    searchAndDisable(id:number, pLtPosition:Position):void{
        let p = this.pool.find(x=> x.projectileId==id);

        if(p==undefined)
        {
            console.log(`error: no projectile ${id}`);
            return;
        }

        p.setDisable(); // 해당 총알의 활성화를 제거
    }
}