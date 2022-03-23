const http=require("http");
const url=require("url");
const fs=require("fs");

const mysql=require("mysql");
const login_info={
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password:'mysql',
    database:'mahjong'
};


function fsData(url){
    return (new Promise((resolve,reject)=>{
        fs.readFile(url,(e,data)=>{
        //readFile 성공하면 문자열의 형태로 사용가능
            resolve(data);
        })
    }));
};
function mysqQeury(sql,param_arr=[]){
    return (new Promise((resolve,reject)=>{
        const create_conn=mysql.createConnection(login_info);
        resolve(create_conn);
    }).then((create_conn)=>{
        return new Promise((resolve,reject)=>{
            create_conn.connect((e)=>{
                if(e){create_conn.end((e)=>{}); throw new Error(e); }
                resolve(create_conn)
            });
        });
    }).then((conn)=>{
        return new Promise((resolve,reject)=>{
            conn.query(sql,param_arr,(e,result)=>{
                if(e){create_conn.end((e)=>{}); throw new Error(e); }
                resolve({'result':result,'conn':conn})
            });
        });
    })
    );
};

const READ_ONEHAN_SQL=`SELECT NAME,ONEHAN_IMG FROM ONEHAN`;

http.createServer(async(req,res)=>{
    const url_parse= url.parse(req.url,true);
    // url.parse() : URL 문자열을 입력하면 URL 객체를 만든다.
    if(url_parse.pathname==="/" || url_parse.pathname==="/index"){
        let data=await fsData("./public/index.html");
        res.write(data);
        res.end();

    }else if(url_parse.pathname==="/onehan/list.do"){
        let data=fsData("./public/onehan_list.html");
        let result=mysqQeury(READ_ONEHAN_SQL,[]);
        data = await data;
        result = await result;
        console.log(result["result"]);
        res.write(`<script>
                    const ONEHAN_LIST=${JSON.stringify(result["result"])}; 
                    console.log(ONEHAN_LIST);
                  </script>`);
        result["conn"].end((e)=>{
        });
        res.write(data);
        res.end();

    // }else if(url_parse.pathname==="/onehan/detail.do"){
    //     let data=await fsData("./public/onehan_detail.html");
    //     res.write(data);
    //     res.end();

    }else if(url_parse.pathname.split("/")[1]==="public"){
        if(url_parse.pathname.split("/")[2]==="img"){
            // "/" 절대경로 사용시 c://public 으로 사용됨
            // "./" 상대경로 사용시 mahjong/public       이게 뭔 소리여
            try{
                let img=await fsData("."+url_parse.pathname);
                res.setHeader("Content-Type","image/jpg");
                res.write(img);
                res.end();
            }catch(e){
                console.error(e);
                res.statusCode=404;
                res.end();
            };
        };
    };
    
    // res.setHeader("Content-Type","text/html;charset=UTF-8"); //응답할 파일 형식 작성
    
}).listen(3742);


//query("sql",(err,result[성공했을 때 결과물])=>{
//     sql이 성공했을 때 콜백함수
// });





