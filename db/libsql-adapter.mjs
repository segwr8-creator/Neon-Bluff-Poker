// Preserve the existing prepared-statement contract on a remote libSQL database.
// batch(..., 'write') is one transaction: a failure rolls every statement back.
export function adaptLibsql(client) {
  const result = r => ({results:r.rows.map(row=>Object.fromEntries(r.columns.map((c,i)=>[c,row[i]]))),meta:{changes:r.rowsAffected},success:true});
  function prepare(sql, args=[]) {
    return {
      statement:{sql,args},
      bind(...values){return prepare(sql,values)},
      async all(){return result(await client.execute({sql,args}))},
      async first(column){const row=(await this.all()).results[0];return column?row?.[column]??null:row??null},
      async run(){return this.all()},
      async raw(){const r=await client.execute({sql,args});return r.rows.map(row=>r.columns.map((_,i)=>row[i]))}
    };
  }
  return {prepare,async batch(statements){return (await client.batch(statements.map(s=>s.statement),'write')).map(result)}};
}
