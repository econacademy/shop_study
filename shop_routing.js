const http=require("http");
const url=require("url");
const fs=require("fs");
const mysql=require("mysql");
const login_info={
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password:'mysql',
    database:'shop'
}
//서버(라우팅) 127.0.0.1:3450
//서버에 처음 접속 2가지 http://127.0.0.1:3450 or 127.0.0.1:3450/index.html
//http://127.0.0.1:3450/member/c,r,u,d or http://127.0.0.1:3450/board/c,r,u,d 
//nodemon npm (node로 실행 중인 js가 내용이 바뀌면 자동으로 종료후 실행)
//npm install -g nodemon
//nodemon 보안 오류 해결
//powershell을 관리자 권한으로 실행
//set-executionpolicy unrestricted => y
http.createServer((req,res)=>{
    let url_parse=url.parse(req.url,true);
    console.log(url_parse.pathname);
    console.log("접속");
    if(url_parse.pathname==="/" || url_parse.pathname==="/index.html"){
        fs.readFile("public/index.html",(e,index)=>{
            //readFile 성공하면 문자열의 형태로 사용가능
            res.end(index);
        })
    }else if(url_parse.pathname==="/member/list.do" ){
        fs.readFile("public/memList.html",(e,memList)=>{
            console.log("멤버관리 리스트입니다. 환영합니다.");
            res.end(memList);
        })
    }else if(url_parse.pathname==="/member/ajax/read.do"){
        const conn=mysql.createConnection(login_info);
        conn.connect(function(e){
            conn.query("SELECT * FROM MEMBER",(e,memList)=>{
                res.setHeader("Content-Type","application/json;charset=UTF-8");
                res.write(JSON.stringify(memList));
                res.end();
                conn.end((e)=>{});
            });
        })
    }else if(url_parse.pathname==="/member/ajax/readDetail.do"){
        const conn=mysql.createConnection(login_info);
        conn.connect(()=>{
            conn.query("SELECT * FROM MEMBER WHERE ID=?",[url_parse.query["id"]],(e,mem)=>{
                console.log("mem",mem);
                res.setHeader("Content-Type","application/json;charset=UTF-8");
                res.end(JSON.stringify(mem));
                conn.end((e)=>{});

            });
        });

    }else if(url_parse.pathname==="/member/ajax/update.do"){
        //post로 보낸 파라미터 받기
        let post_data=""
        req.on("data",(data)=>{
            post_data+=data;
        });
        req.on("end",()=>{
            const form_data=JSON.parse(post_data);
            const conn=mysql.createConnection(login_info);
            conn.connect((e)=>{
                conn.query("UPDATE MEMBER SET NAME=?,PHONE=?,BIRTH=? WHERE ID=?",
                [form_data["name"],form_data["phone"],form_data["year"],form_data["id"]],(e,result)=>{
                    const result_obj={result:0, msg:""}
                    if(e){
                        result_obj.result=-1; 
                        result_obj.msg="에러:"+e.message;
                    }else{
                        result_obj.result=result.affectedRows;
                    }
                    res.setHeader("Content-Type","application/json;charset=UTF-8");
                    res.end(JSON.stringify(result_obj))
                    conn.end((e)=>{});
                })
            })

        })

    }else if(url_parse.pathname==="/member/ajax/delete.do"){
        const conn=mysql.createConnection(login_info); 
        conn.connect((e)=>{
            conn.query("DELETE FROM MEMBER WHERE ID=?",[url_parse.query["id"]],(e,result)=>{
                const result_obj={result:0, msg:""}
                if(e){
                    result_obj.result=-1; 
                    result_obj.msg="에러:"+e.message;
                }else{
                    result_obj.result=result.affectedRows;
                }
                res.setHeader("Content-Type","application/json;charset=UTF-8");
                res.end(JSON.stringify(result_obj))
                conn.end((e)=>{});
            })
        })


    }else if(url_parse.pathname==="/member/ajax/create.do"){
        //페이로드에 포함된 post 파라미터 받는 법
        let formDataTxt=""
        req.on("data",(formData)=>{
            formDataTxt+=(formData);
        });
        req.on("end",()=>{
            const form=JSON.parse(formDataTxt);
            const conn=mysql.createConnection(login_info);
            conn.connect((e)=>{
                conn.query(`INSERT INTO MEMBER (ID,NAME,PHONE,BIRTH) VALUES (?,?,?,?)`,
                [form.id,form.name,form.phone,form.year],(e,result)=>{
                    const result_obj={result:0, msg:""}
                    if(e){
                        result_obj.result=-1;
                        result_obj.msg="에러:"+e.message;
                    }else{
                        result_obj.result=result.affectedRows;
                    }
                    res.setHeader("Content-Type","application/json;charset=UTF-8");
                    res.end(JSON.stringify(result_obj))
                    conn.end((e)=>{});
                })
            });
        });
        //on("data") :buffer에 data을 읽는 중 => on(end) : data가 끝나는 지점


    }else{
        res.setHeader("Content-Type","text/html;charset=UTF-8")
        res.statusCode=404; //응답 상태
        res.end("404 없는 페이지 입니다.")
    }
}).listen(3450,()=>{
    console.log("http://127.0.0.1:3450 or 127.0.0.1:3450/index.html");
});
