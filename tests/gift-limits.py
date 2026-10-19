"""Exercise the actual SQL guard using SQLite transactions, including races."""
import concurrent.futures, json, pathlib, sqlite3, subprocess, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
POLICY=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as p from './public/gift-policy.mjs';console.log(JSON.stringify(p))"],cwd=ROOT))
NOW=1792288800000
DAY=NOW//86400000*86400000
class GiftTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.file=pathlib.Path(self.tmp.name)/'db.sqlite'
  db=self.connect()
  for file in sorted((ROOT/'drizzle').glob('*.sql')):
   db.executescript(file.read_text())
  for p in ['s','r','r2','s2']:
   db.execute('INSERT INTO profiles(id,name,created,updated,cash_balance) VALUES(?,?,?,?,?)',(p,p,NOW,NOW,100000))
  for a,b in [('s','r'),('s','r2'),('s2','r')]:
   db.execute("INSERT INTO friendships VALUES(?,?,?,'accepted',?)",(':'.join(sorted([a,b])),a,b,NOW))
  db.commit();db.close()
 def tearDown(self): self.tmp.cleanup()
 def connect(self):return sqlite3.connect(self.file,timeout=10)
 def gift(self,id,amount=POLICY['GIFT_MAX'],s='s',r='r',created=NOW):
  with self.connect() as db:db.execute("INSERT INTO gifts(id,sender,recipient,amount,status,created) VALUES(?,?,?,?,'pending',?)",(id,s,r,amount,created))
 def accept(self,id,now=NOW):
  db=self.connect()
  try:
   db.execute('BEGIN IMMEDIATE')
   g=db.execute('SELECT sender,recipient,amount FROM gifts WHERE id=?',(id,)).fetchone();s,r,n=g
   mutation=__import__('uuid').uuid4().hex
   changed=db.execute(POLICY['GIFT_ACCEPT_SQL'],(mutation,now,id,r,now-86400000,s,n,':'.join(sorted([s,r])),s,now//86400000*86400000,r,now//86400000*86400000)).rowcount
   db.execute('UPDATE profiles SET cash_balance=cash_balance-? WHERE id=? AND EXISTS(SELECT 1 FROM gifts WHERE id=? AND mutation=?)',(n,s,id,mutation))
   db.execute('UPDATE profiles SET cash_balance=cash_balance+? WHERE id=? AND EXISTS(SELECT 1 FROM gifts WHERE id=? AND mutation=?)',(n,r,id,mutation))
   db.commit();return changed
  finally:db.close()
 def test_duplicate_and_conservation(self):
  self.gift('a');self.assertEqual(self.accept('a'),1);self.assertEqual(self.accept('a'),0)
  with self.connect() as db:self.assertEqual(db.execute('SELECT SUM(cash_balance) FROM profiles').fetchone()[0],400000)
 def test_sender_limit_race_across_friends(self):
  for i in range(4):self.gift(str(i),r='r' if i!=3 else 'r2')
  with concurrent.futures.ThreadPoolExecutor(4) as pool: results=list(pool.map(self.accept,map(str,range(4))))
  self.assertEqual(sum(results),3)
 def test_recipient_limit_across_senders(self):
  self.gift('a');self.gift('b');self.gift('c',s='s2');self.gift('d',s='s2')
  self.assertEqual([self.accept(x) for x in ['a','b','c','d']],[1,1,1,0])
 def test_rejected_amounts(self):
  for i,n in enumerate([0,4,6,POLICY['GIFT_MAX']+5,-5]):
   self.gift(str(i),n);self.assertEqual(self.accept(str(i)),0)
 def test_approval_expiry_and_affordability(self):
  self.gift('expired',created=NOW-86400001);self.assertEqual(self.accept('expired'),0)
  self.gift('a')
  with self.connect() as db:db.execute("UPDATE profiles SET cash_balance=1 WHERE id='s'")
  self.assertEqual(self.accept('a'),0)
  with self.connect() as db:db.execute("UPDATE profiles SET cash_balance=100000,gift_locked=1 WHERE id='s'")
  self.assertEqual(self.accept('a'),0)
  with self.connect() as db:
   db.execute("UPDATE profiles SET gift_locked=0 WHERE id='s'");db.execute("UPDATE friendships SET status='declined'")
  self.assertEqual(self.accept('a'),0)
 def test_quota_uses_acceptance_day_and_resets(self):
  # The request was yesterday; accepting it today must consume today's quota.
  self.gift('a',created=DAY-1000);self.assertEqual(self.accept('a'),1)
  self.gift('b');self.assertEqual(self.accept('b'),1)
  self.gift('c');self.assertEqual(self.accept('c'),1)
  self.gift('over');self.assertEqual(self.accept('over'),0)
  tomorrow=DAY+86400000+1000
  self.gift('d',created=tomorrow);self.assertEqual(self.accept('d',tomorrow),1)
if __name__=='__main__':unittest.main()
