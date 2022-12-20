const btn = document.querySelector("#btnRand");

btn.addEventListener("click", e => {
    let ratio = Math.random();
    if (ratio < 0.5) {
        alert("좋아!");
    }
    else {
        alert("안돼.");
    }
});