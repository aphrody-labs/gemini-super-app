var n=require("electron");window.addEventListener("DOMContentLoaded",()=>{let e=document.getElementById("back");e&&e.addEventListener("click",()=>n.ipcRenderer.send("backbar:home"))});
