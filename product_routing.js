const http = require("http");
const url = require("url");
const mysql = require("mysql");
const fs = require("fs");
const login_info = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password:'mysql',
    database:'shop'
}
const READ_SQL=`SELECT P.*,C.NAME CATEGORY 
                FROM PRODUCT P INNER JOIN CATEGORY C
                USING(CATEGORY_NUM)
                LIMIT ?,?`;
const READ_CATE_SQL=`SELECT P.*,C.NAME CATEGORY 
                    FROM PRODUCT P INNER JOIN CATEGORY C
                    USING(CATEGORY_NUM)
                    WHERE CATEGORY_NUM=?
                    LIMIT ?,?`;

const READ_DETAIL_SQL=`SELECT P.*,C.NAME CATEGORY 
                FROM PRODUCT P INNER JOIN CATEGORY C
                USING(CATEGORY_NUM) WHERE PRODUCT_NUM=?`;
const DELETE_SQL="DELETE FROM PRODUCT WHERE PRODUCT_NUM=?"; 
const READ_CATEGORY_SQL="SELECT * FROM CATEGORY";
const UPDATE_SQL=`  UPDATE PRODUCT SET 
                    NAME=?, TITLE=?, COUNT=?, PRICE=?, COLOR=?, MODEL_NUM=?, CATEGORY_NUM=?
                    WHERE PRODUCT_NUM=?`;
const COMMENT_LIST_SQL=`SELECT * FROM PRODUCT_COMMENT WHERE PRODUCT_NUM=?`
const COMMENT_VISIABLE_UPDATE_SQL=`"UPDATE PRODUCT_COMMENT 
                                    SET VISIABLE=? 
                                    WHERE COMMENT_NUM=?"`;
const CATE_MAIN_LIST=`SELECT NAME, CATEGORY_NUM
                        FROM CATEGORY
                        WHERE SUB IS NULL`;
const CATE_SUB_LIST=`SELECT M.NAME MAIN_NAME, S.CATEGORY_NUM,S.NAME
                        FROM CATEGORY M INNER JOIN CATEGORY S
                        ON M.CATEGORY_NUM=S.SUB
                        WHERE M.SUB IS NULL`;
const CATE_DETAIL_LIST=`SELECT S.NAME MAIN_NAME, D.CATEGORY_NUM, D.NAME
                        FROM CATEGORY M INNER JOIN CATEGORY S
                        ON M.CATEGORY_NUM=S.SUB
                        INNER JOIN CATEGORY D
                        ON S.CATEGORY_NUM=D.SUB
                            WHERE M.SUB IS NULL`;
const PAGE_LENGTH=6;//출력되는 페이지의 길이

http.createServer(async (req,res)=>{
    console.log(req.url+" 요청이 들어왔습니다.");
    const url_parse= url.parse(req.url,true);
    if(url_parse.pathname==="/" || url_parse.pathname==="/index.html"){
        let data=await fsData("./public/index.html");
        res.write(data);
        res.end();
    }else if(url_parse.pathname==="/header/menu.do"){
        let data=await fsData("./public/header_menu.html");
        res.write(data);
        res.end();
    }else if(url_parse.pathname==="/item/menu.do"){
        let data= fsData("./public/product_menu.html");
        let main_obj= mysqQeury(CATE_MAIN_LIST);
        let sub_obj= mysqQeury(CATE_SUB_LIST);
        let detail_obj= mysqQeury(CATE_DETAIL_LIST);
        data=await data;
        main_obj=await main_obj;
        sub_obj=await sub_obj;
        detail_obj=await detail_obj;
        let sub_obj_arr=cateArrObj(sub_obj["result"]);
        let detail_obj_arr=cateArrObj(detail_obj["result"]);
        res.write(`<script>
            const MAIN_CATE_LIST=${JSON.stringify(main_obj["result"])};
            const SUB_CATE_LIST=${JSON.stringify(sub_obj_arr)};
            const DETAIL_CATE_LIST=${JSON.stringify(detail_obj_arr)};
        </script>`);
        res.write(data);
        res.end();
    }else if(url_parse.pathname==="/item/pagination.do"){
        let data=fsData("./public/pagination.html");
        //첫번째 인자는 페이지 계산, 두번째 인자는 페이지 길이
        let page=(url_parse.query["page"])?url_parse.query["page"]:1;
        let count_result=mysqQeury("SELECT COUNT(*) COUNT FROM PRODUCT");
        count_result= await count_result;
        data=await data;
        res.write(`<script>
                    const PAGE=${page}
                    const PAGE_LENGTH=${PAGE_LENGTH};
                    const PRODUCT_COUNT=${count_result["result"][0]["COUNT"]};
                    </script>`);
        res.write(data);
        res.end();
        count_result["conn"].end((e)=>{});
    }else if(url_parse.pathname==="/item/list.do"){
        let data= fsData("./public/product_list.html");
        let page=(url_parse.query["page"])?url_parse.query["page"]:1;
        let result= mysqQeury(READ_SQL,[(page-1)*PAGE_LENGTH,PAGE_LENGTH]);
        data = await data;
        result = await result;
        res.write(` <script>
                        const PRODUCT_LIST=${JSON.stringify(result["result"]) };
                        const PAGE=${page};
                    </script>`);
        result["conn"].end((e)=>{});
        res.write(data);
        res.end();
    }else if(url_parse.pathname==="/item/cate/pagination.do"){
        let data= fsData("./public/pagination.html");
        let page=(url_parse.query["page"])?url_parse.query["page"]:1;
        let cate_num=url_parse.query["category_num"];
        let count_result=mysqQeury("SELECT COUNT(*) COUNT FROM PRODUCT WHERE CATEGORY_NUM=?",[cate_num]);
        data=await data;
        count_result=await count_result;
        console.log(cate_num,"카테고리 길이"+count_result["result"][0]["COUNT"]);
        res.write(`<script>
                    const PAGE=${page}
                    const PAGE_LENGTH=${PAGE_LENGTH};
                    const PRODUCT_COUNT=${count_result["result"][0]["COUNT"]};
                    </script>`);

        res.write(data);
        res.end();
    }else if(url_parse.pathname==="/item/cateList.do"){
        let page=(url_parse.query["page"])?url_parse.query["page"]:1;
        let data= fsData("./public/product_cate_list.html");
        //limit 12,6
        let result= mysqQeury(READ_CATE_SQL,[url_parse.query["category_num"],(page-1)*PAGE_LENGTH,PAGE_LENGTH]);
        data = await data;
        result = await result;
        res.write(` <script>
                        const PRODUCT_LIST=${JSON.stringify(result["result"]) };
                        const PAGE=${page};
                        const CATEGORY_NUM=${url_parse.query["category_num"]};
                    </script>`);
        result["conn"].end((e)=>{})
        res.write(data);
        res.end();
    }else if(url_parse.pathname==="/item/detail.do"){
        let data=fsData("./public/product_detail.html");
        let result_obj=mysqQeury(READ_DETAIL_SQL,[url_parse.query.id]);
        let cate_result_obj=mysqQeury(READ_CATEGORY_SQL);
        cate_result_obj=await cate_result_obj;
        data= await data;
        result_obj = await result_obj;
        res.write(
            `<script>
            const PRODUCT=${JSON.stringify(result_obj['result'][0])};
            const CATE_LIST=${JSON.stringify(cate_result_obj['result'])};
            </script>`)
        res.write(data);
        res.end();
        result_obj.conn.end((e)=>{});
        cate_result_obj.conn.end((e)=>{});
    }else if(url_parse.pathname==="/item/delete.do"){
        let result={affectedRows:0, msg:"없는 레코드 입니다."};
        try{
            let result_obj=await mysqQeury(DELETE_SQL,[url_parse.query["id"]]);
            result.affectedRows=result_obj["result"].affectedRows;
            if(result.affectedRows>0){result.msg="레코드 삭제 성공입니다."}
            result_obj.conn.end((e)=>{})
        }catch(e){
            result.affectedRows=-1;
            result.msg="참조하고 있는 레코드가 있거나 통신장애로 오류가 발생";
            console.error(e.msg);
        }
        console.log(result);
        res.setHeader("Content-Type","application/json;charset=UTF-8");
        res.write(JSON.stringify(result));
        res.end();
    }else if(url_parse.pathname==="/item/update.do" && req.method==="POST"){
        let post_data="";  
        await req.on("data",(data)=>{ post_data+=data;});
        const post_obj=JSON.parse(post_data);
        const result={affectedRows:0,msg:"삭제된 레코드"}
        try{
            const result_obj=await mysqQeury(UPDATE_SQL,
            [post_obj.NAME,  post_obj.TITLE,     post_obj.COUNT,        post_obj.PRICE
            ,post_obj.COLOR, post_obj.MODEL_NUM, post_obj.CATEGORY_NUM, post_obj.PRODUCT_NUM]);
            console.log(result_obj.result);
            result.affectedRows=result_obj.result.affectedRows;
            if(result.affectedRows>0){result.msg="수정 성공입니다. 페이지를 새로고침 합니다."}
            result_obj.conn.end((e)=>{})
        }catch(e){
            result.affectedRows=-1; result.msg=e.msg;
        }
        res.setHeader("Content-Type","application/json;charset=UTF-8");
        res.write(JSON.stringify(result));
        res.end();
    }else if(url_parse.pathname==="/item/comment/list.do"){
        
        let result_obj=await mysqQeury(COMMENT_LIST_SQL,[url_parse.query["product_num"]])
        res.setHeader("Content-Type","application/json;charset=UTF-8")
        res.write(JSON.stringify(result_obj["result"]));
        res.end();
        result_obj["conn"].end((e)=>{});
    }else if(url_parse.pathname==="/item/comment/visiableUpdate.do"){
        let visiable_param=Number(url_parse.query["visiable"]);
        let comment_num_param=Number(url_parse.query["comment_num"]);
        //console.log(visiable_param,comment_num_param);
        const result={affectedRows:0,msg:"삭제된 레코드"};//0이면 이미 삭제되서 수정 x
        try{
            let result_obj=await mysqQeury(COMMENT_VISIABLE_UPDATE_SQL,
            [visiable_param,comment_num_param]);
            if(result_obj["result"]){
                console.log(visiable_param);
                result.affectedRows=result_obj["result"].affectedRows;
                if(result_obj["result"].affectedRows>0 && visiable_param==1){
                    result.msg="댓글 보이게 수정성공" 
                }else{
                    result.msg="댓글 보이이지 않게 수정성공" 
                }       
            }
            result_obj.conn.end(()=>{});
        }catch(e){
            result.affectedRows=-1;
            result.msg=e.msg;
            console.error("오류"+e.msg);
        }
        res.setHeader("Content-Type","application/json;charset=UTF-8");
        res.write(JSON.stringify(result));
        res.end()
    }else if(url_parse.pathname.split("/")[1]==="public"){
        if(url_parse.pathname.split("/")[2]==="img"){
            // "/" 절대경로 사용시 c://public 으로 사용됨
            // "./" 상대경로 사용시 shop/public
            try{
                let img=await fsData("."+url_parse.pathname);
                res.setHeader("Content-Type","image/jpeg")
                res.write(img);
                res.end();
            }catch(e){
                console.error(e);
                res.statusCode=404;
                res.end("찾을 수 없는 이미지");
            }
        }else if(url_parse.pathname.split("/")[2]==="css"){

        }else if(url_parse.pathname.split("/")[2]==="js"){

        }
    }
}).listen(3456);

function fsData(url){
    return (new Promise((resolve,reject)=>{
        fs.readFile(url,(e,data)=>{
            resolve(data);
        })
    }));
}
function mysqQeury(sql,param_arr=[]){
    return (new Promise((resolve,reject)=>{
        const create_conn=mysql.createConnection(login_info);
        resolve(create_conn);
    }).then((conn)=>{
        return new Promise((resolve,reject)=>{
            conn.connect((e)=>{
                if(e){conn.end((e)=>{}); throw new Error("에러"+e.msg);  }
                resolve(conn);
            })
        });
    }).then((conn)=>{
        return new Promise((resolve,reject)=>{
            conn.query(sql,param_arr,(e,result)=>{
                if(e){ conn.end((e)=>{}); throw new Error("에러"+e.msg);   }
                resolve({'result':result,'conn':conn})
            });
        })
    })
    );
}

function cateArrObj( sub_obj ){
    let sub_obj_arr=new Object();
        sub_obj.forEach((cate)=>{
            let sub_arr;
            if( cate["MAIN_NAME"] in sub_obj_arr){
                sub_arr= sub_obj_arr[cate["MAIN_NAME"]];
            }else{
                sub_arr=[];
            }
            let menu_obj=new Object();
            sub_obj_arr[cate["MAIN_NAME"]]=sub_arr;
            menu_obj["CATEGORY_NUM"]=cate["CATEGORY_NUM"];
            menu_obj["NAME"]=cate["NAME"];
            sub_arr.push(menu_obj);
        });
    return sub_obj_arr;
} 
