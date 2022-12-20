import 'phaser'

export default class PlayerSprite extends Phaser.Physics.Arcade.Sprite {
    mainScene: Phaser.Scene;
    isDie: boolean = false;
    canDestroyPlatform: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number, key: string) {
        super(scene, x, y, key); // 부모 생성자 호출해서 만들어주고
        scene.add.existing(this); // 씬에다가 추가
        scene.physics.add.existing(this); // 물리엔진에다가도 연산하도록 추가

        this.mainScene = scene;
    }

    die(multiplier: number): void {
        this.isDie = true;
        this.setVelocityY(-200);
        this.setVelocityX(200 * multiplier);
        // 여기다가 트윈도 추가

        this.mainScene.tweens.add({
            targets:this,
            angle:45*multiplier,
            duration:500
        })
    }
}