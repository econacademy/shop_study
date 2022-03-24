//id지정된 것들 
const loadMemListBtn=document.getElementById("loadMemListBtn");
const memList=document.getElementById("memList");
loadMemListBtn.addEventListener("click",memRead)
//const AJXZ_URL="/member/"
function memRead(){
    fetch("/member/ajax/read.do")
    .then((res)=>{return res.json()})
    .then(memList=>{console.log(memList);})

}
function memReadDetail(id){}
function memUpdate(form){}
function memCreate(form){}
function memDelete(id){}