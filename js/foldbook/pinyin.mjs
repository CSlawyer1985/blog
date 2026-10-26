// Small local starter dictionary. No requests, telemetry, or cloud input service.
const words = {
  a:'啊 阿', ai:'爱 AI 矮', an:'安 按 案', ba:'吧 把 八', bai:'百 白', ban:'办 半 班', bei:'被 北 杯', ben:'本', bi:'比 笔 必', bian:'变 编 边', biao:'表 标', bie:'别', bing:'并 病', bo:'博 波', bu:'不 部 步',
  cai:'才 财', can:'参', ce:'测 策', cha:'查 茶', chan:'产', chang:'长 常 场', che:'车', chen:'陈 晨', cheng:'成 程 城', chi:'吃 持', chu:'出 处 初', ci:'次 此 词', cong:'从', da:'大 打 达', dai:'代 带', dan:'但 单', dao:'到 道', de:'的 得 地', deng:'等 灯', di:'地 第 低', dian:'点 电', ding:'定 顶', dong:'动 东 懂', dou:'都 豆', du:'读 度', dui:'对 队', duo:'多',
  e:'额', en:'嗯', er:'二 而 儿', fa:'法 发', fan:'反 范', fang:'方 放', fei:'非 飞', fen:'分 份', feng:'风 封', fu:'服 复 付', gai:'改 该', gan:'感 干', gao:'高 告', ge:'个 各', gei:'给', gen:'跟 根', geng:'更', gong:'工 公 共', gou:'够 构', gu:'古 股', guan:'关 管 观', guang:'光 广', gui:'规 贵', guo:'国 过 果',
  hai:'还 海', han:'汉 含', hao:'好 号', he:'和 合', hei:'黑', hen:'很', hong:'红', hou:'后 候', hua:'话 化 花', huan:'换 欢', hui:'会 回', huo:'或 活', ji:'机 记 及', jia:'家 加', jian:'见 件 建', jiang:'将 讲', jiao:'交 教', jie:'接 解 节', jin:'今 进 金', jing:'经 京', jiu:'就 九', ju:'据 局', jue:'决 觉', jun:'均',
  kai:'开', kan:'看', kao:'考', ke:'可 科 客', kong:'空', ku:'库', kuai:'快', lai:'来', lan:'蓝 栏', lao:'老', le:'了 乐', lei:'类', li:'里 理 利', lian:'联 连', liang:'两 量', liao:'聊 料', lin:'林', ling:'零 另', liu:'六 流', long:'龙', lu:'路 录', lun:'论', lv:'律 绿', lve:'略',
  ma:'吗 马', mai:'买', man:'慢 满', mei:'没 美 每', men:'们 门', meng:'梦', mi:'米 密', mian:'面', ming:'名 明', mo:'模 末', mou:'某', mu:'目 木', na:'那 拿', nan:'难 南', ne:'呢', neng:'能', ni:'你 尼', nian:'年 念', ning:'宁', niu:'牛', nong:'农', nu:'努', nv:'女',
  o:'哦', ou:'欧', pa:'怕', pai:'排 派', pan:'判 盘', pei:'配', peng:'朋', pi:'批', pian:'篇', ping:'平 屏', po:'破', pu:'普', qi:'起 七 期', qian:'前 钱', qiang:'强', qiao:'桥', qie:'切 且', qin:'亲', qing:'请 清 情', qiu:'求 球', qu:'去 区', quan:'全 权', que:'确 却', ran:'然', rang:'让', re:'热', ren:'人 任', reng:'仍', ri:'日', rong:'容', ru:'如 入', ruan:'软',
  san:'三', se:'色', shan:'山', shang:'上 商', shao:'少', she:'设 社', shen:'审 深', sheng:'生 声', shi:'是 时 石 事 师 十', shou:'手 收', shu:'书 数 输', shuang:'双', shui:'水 谁', shuo:'说', si:'四 思', song:'送', sou:'搜', su:'诉 速', suo:'所 缩', ta:'他 她 它', tai:'台 太', tan:'谈', tang:'堂', tao:'套', te:'特', ti:'题 体', tian:'天', tiao:'条', ting:'听', tong:'同 通', tou:'投 头', tu:'图', tui:'退 推',
  wai:'外', wan:'万 完', wang:'网 往', wei:'为 位 未', wen:'文 问', wo:'我', wu:'五 无 物', xi:'系 西', xia:'下', xian:'现 先', xiang:'想 向 项', xiao:'小 消', xie:'写 谢', xin:'新 信', xing:'行 性', xiong:'兄', xiu:'修', xu:'需 序', xuan:'选', xue:'学', xun:'讯', ya:'呀', yan:'研 言', yang:'样', yao:'要', ye:'也 页', yi:'一 以 已', yin:'因 音', ying:'应 英', yong:'用', you:'有 又 友', yu:'与 语', yuan:'元 原', yue:'月 约', yun:'云',
  zai:'在 再', zan:'赞', zao:'早', ze:'则', zen:'怎', zeng:'增', zhan:'展 站', zhang:'张 章', zhao:'找 照', zhe:'这 折', zhen:'真', zheng:'正 证', zhi:'知 之 只', zhong:'中 种', zhou:'周', zhu:'主 注', zhuan:'转 专', zhuang:'状', zi:'字 自', zong:'总', zou:'走', zu:'组', zui:'最', zuo:'做 作 左',
  nihao:'你好', xiexie:'谢谢', zhongguo:'中国', falv:'法律', lvshi:'律师', chenshi:'陈石', boke:'博客', wenzhang:'文章', sousuo:'搜索', biji:'笔记', diannao:'电脑', shuru:'输入', zhongwen:'中文', yingwen:'英文', rengongzhineng:'人工智能', hetong:'合同', gongsi:'公司', nihaohaoma:'你好好吗', shijie:'世界', kaishi:'开始', ceshi:'测试', zhedie:'折叠', pingmu:'屏幕', jiaohu:'交互', nihaoshijie:'你好世界'
};
export function candidates(raw) {
  const text = raw.toLowerCase().replaceAll("'",'');
  if (words[text]) return words[text].split(' ');
  // Greedy syllable segmentation offers a basic phrase even without a phrase entry.
  if(text.length>48) return [];
  const memo=new Map();
  const solve = (rest, depth=0) => {
    if (!rest) return '';
    if (depth>12) return null;
    const key=rest+':'+depth;if(memo.has(key))return memo.get(key);
    for(let n=Math.min(6,rest.length); n>0; n--) {
      const part=words[rest.slice(0,n)];
      if (!part) continue;
      const tail=solve(rest.slice(n),depth+1);
      if(tail!==null) return part.split(' ')[0]+tail;
    }
    memo.set(key,null);return null;
  };
  const phrase=solve(text);
  return phrase ? [phrase] : [];
}
