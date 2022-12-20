import MySQL, { RowDataPacket } from 'mysql2/promise'

const poolOption : MySQL.PoolOptions =
{
    host: "gondr.asuscomm.com",
    user: 'yy_20107',
    password: '1234',
    database: 'yy_20107',
    connectionLimit:10
};

export interface Score extends RowDataPacket
{
    id:number,
    username:string, 
    level:number,
    time:Date
}

export const ConPool:MySQL.Pool = MySQL.createPool(poolOption);