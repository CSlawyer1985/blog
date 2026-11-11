# -*- coding: utf-8 -*-
# 夜校 GP：在 Turbo Tails 基础上做夜校主题重制（纯文案层重皮 + 资产拆分以满足 CF 25MiB 限制）。
# 原作：Peter Yang (turbo-tails.vercel.app)，保留其 YouTube 署名链接。
# 运行：python3 -I scratch/retheme-turbo-tails.py
import os, re, sys

# 原始文件（下载缓存），不修改原文件
src_candidates = [
    os.path.join(os.environ.get('TMPDIR', '/tmp'), 'turbo-tails.html'),
]
src = next(p for p in src_candidates if os.path.exists(p))
s = open(src, encoding='utf-8').read()
orig_len = len(s)

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'desktop', 'games')
OUT_HTML = os.path.join(OUT_DIR, 'night-school-gp.html')
OUT_ASSETS = os.path.join(OUT_DIR, 'gp-assets.js')
OUT_MUSIC = os.path.join(OUT_DIR, 'gp-music.js')

R = [
    # 赛道全称（含 sub/loading 的长串优先）
    ('CORAL COVE GRAND PRIX', '灯火湾 · 入门赛'),
    ('THUNDER TEMPLE GRAND PRIX', '提示词丛林 · 机关赛'),
    ('MAGMA PEAK NIGHT RACE', '算力火山 · 夜间赛'),
    ('SKY CASTLE GP', '云端城堡 · 决赛'),
    # 标题与品牌
    ('<title>Turbo Tails</title>', '<title>夜校 GP · 四明山法师卡丁</title>'),
    ('WILD ISLE GRAND PRIX', '四明山法师卡丁 · 法律人 AI 实操夜校'),
    ('TURBO TAILS', '夜校 GP'),
    ('>Turbo Tails<', '>夜校 GP<'),
    ('>TAILS<', '>GP<'),
    ('WATCH HOW I BUILT THIS', '原作 Peter Yang · 观看制作过程'),
    ('Subscribe to my YouTube!', '关注原作者 Peter Yang'),
    ('Subscribe', '订阅频道'),
    ('Maybe later', '以后再说'),
    # 模式与按钮
    ('CHOOSE YOUR RACER', '选择你的夜校同学'),
    ('START GRAND PRIX', '开始夜校杯'),
    ('START RACE', '开始比赛'),
    ('PLAY THE CUP', '参加夜校杯'),
    ('OR PICK ONE TRACK', '或选单条赛道'),
    ('ALL 4 TRACKS', '全部 4 条赛道'),
    ('SINGLE PLAYER', '单人竞速'),
    ('MULTIPLAYER', '多人同乐'),
    ('▶◀ BACK', '▶◀ 返回'),
    ('◀ BACK', '◀ 返回'),
    ('COPY INVITE LINK', '复制邀请链接'),
    ('HOW TO WIN', '获胜要诀'),
    # HUD 与教程
    ('TURBO · SHIFT', '涡轮 · SHIFT'),
    ('GRAB COINS', '收集灯火'),
    ('Each one makes you faster', '每一盏灯火都让你更快'),
    ('DRIFT + DO TRICKS', '漂移 + 特技'),
    ('Both fill your turbo meter', '都能回充涡轮'),
    ('PRESS SHIFT', '按下 SHIFT'),
    ('TAP TURBO', '点按涡轮'),
    ('Spend a bar to blast ahead', '消耗一格，瞬间领先'),
    ('Turbo. Drifts, tricks and coins refill it', '涡轮：漂移、特技、灯火都能回充'),
    ('Hop, drift, trick off ramps', '跳坡、漂移、坡上特技'),
    ('Hold in a turn, tap in the air', '转弯按住，空中点按'),
    ('Use item', '使用道具'),
    ('P or ESC to resume · R to restart', 'P 或 ESC 继续 · R 重开'),
    ('🔇 Sound off · press M', '🔇 静音 · 按 M'),
    ('PAUSED', '暂停'),
    # 道具名（机制不变，概念化重命名）
    ('"TURBO CHILI"', '"MCP 加速"'),
    ('"HOMING ROCKET"', '"Agent 追击"'),
    ('"DURIAN TRAP"', '"幻觉陷阱"'),
    ('"SUPER STAR"', '"Skill 无敌"'),
    ('"THUNDER BOLT"', '"上下文爆炸"'),
    ('"BUBBLE SHIELD"', '"RAG 护盾"'),
    # 赛车（夜校同学 = 校歌里的身份）
    ('{name:"Pip",kind:"the Penguin"', '{name:"法官企鹅",kind:"来自审判的席前"'),
    ('{name:"Blaze",kind:"the Tomcat"', '{name:"庭辩狐狸",kind:"奔走在庭审路上"'),
    ('{name:"Mimi",kind:"the Kitten"', '{name:"合规兔子",kind:"守着企业的边界"'),
    ('{name:"Nibbles",kind:"the Hamster"', '{name:"学者考拉",kind:"追问制度的方向"'),
    ('{name:"Rusty",kind:"the Fox"', '{name:"法学生青蛙",kind:"带着年轻的眼睛"'),
    ('{name:"Bandit",kind:"the Raccoon"', '{name:"法师熊猫",kind:"在夜校重新出发"'),
    ('sE={fox:"the Fox",panda:"the Panda",frog:"the Frog",penguin:"the Penguin",bunny:"the Bunny",koala:"the Koala"}',
     'sE={fox:"庭审路上",panda:"重新出发",frog:"年轻的眼睛",penguin:"审判席前",bunny:"企业边界",koala:"制度方向"}'),
    # 赛道 loading 文案
    ('"Raising the island","Planting palm trees"', '"点亮灯火湾","种下棕榈与灯柱"'),
    ('"Growing the jungle","Waking the temple"', '"唤醒提示词丛林","惊醒古老神庙"'),
    ('"Waking the volcano","Lighting the torches"', '"唤醒算力火山","点亮熔岩火炬"'),
    # 教学 toast
    ('"HOLD DRIFT + STEER"', '"按住漂移键+方向"'),
    ('"HOLD SPACE + \\u2190 \\u2192 TO DRIFT"', '"按住空格+←→ 漂移"'),
    ('"DRIFT TO REFILL TURBO"', '"漂移回充涡轮"'),
    ('"SPACE = TRICK"', '"空格 = 特技"'),
    ('"DRIFT TO REFILL TURBO"', '"漂移回充涡轮"'),
    # 事件 toast
    ('"FINISH!"', '"冲线！"'),
    ('"ROCKET START!"', '"MCP 极速起步！"'),
    ('"SUPER STAR!"', '"Skill 全加载！"'),
    ('"SHIELD UP"', '"RAG 护盾展开"'),
    ('"LIGHTNING STRIKE!"', '"上下文爆炸！"'),
    ('"ZAPPED!"', '"被概念命中！"'),
    ('"SLIPSTREAM!"', '"尾流加速！"'),
    ('"THE VOLCANO IS ERUPTING!"', '"火山喷发了！"'),
    ('"STORM FRONT! DODGE THE LIGHTNING"', '"雷暴来袭！小心闪电"'),
    ('"DRIFT TO REFILL TURBO"', '"漂移回充涡轮"'),
    ('"DRAGON\'S DROP!"', '"龙脊俯冲！"'),
    ('"RIDE THE CURRENT!"', '"乘风而行！"'),
    ('"RING BOOST!"', '"光环加速！"'),
    ('"RING TUNNEL x', '"光环隧道 x'),
    ('"CLOUD HOP x3!"', '"云端三连跳！"'),
    ('"MUD! SLIPPERY"', '"泥地！湿滑"'),
    ('"LAVA BOMB!"', '"熔岩弹！"'),
    ('"BOULDER!"', '"落石！"'),
    ('"MONKEY!"', '"猴子出没！"'),
    ('"CRAB!"', '"螃蟹拦路！"'),
    ('"ROCK!"', '"岩石！"'),
    ('"SPLASH!"', '"溅起水花！"'),
    ('"BOUNCE!"', '"弹跳！"'),
    ('"TRICK!"', '"特技！"'),
    ('"TURBO EMPTY"', '"涡轮耗尽"'),
    ('"TURBO!"', '"涡轮！"'),
    ('"BLOCKED!"', '"被挡下！"'),
    ('"Loading"', '"加载中…"'),
    # 标题艺术字（夜校 / GP）
    ('data-t="TURBO">TURBO<', 'data-t="夜校">夜校<'),
    ('data-t="TAILS">GP<', 'data-t="GP">GP<'),
    # GP 横幅与结算文案（第二批）
    ('"THUNDER TEMPLE GP"', '"提示词丛林 GP"'),
    ('"MAGMA PEAK GP"', '"算力火山 GP"'),
    ('"SKY CASTLE NIGHT FINALE"', '"云端城堡 · 决赛之夜"'),
    ('"SKY CASTLE"', '"云端城堡"'),
    ('"CLOUD HIGHWAY"', '"云端公路"'),
    ('"GRAND PRIX CHAMPION!"', '"夜校杯冠军！"'),
    ('"2ND OVERALL!"', '"全场第 2 名！"'),
    ('"3RD OVERALL!"', '"全场第 3 名！"'),
    ('+" FOR A NEW GRAND PRIX"', "+' · 新开一局夜校杯'"),
    (':" TO PLAY AGAIN"', ":' · 再来一局'"),
    ('"TAP":"PRESS ENTER"', '"点按":"按回车"'),
    ('"This browser is too old for the 3D graphics in Turbo Tails. Update your browser, then open the link again."',
     '"这台浏览器太旧，跑不动夜校 GP 的 3D 画面。请更新浏览器后重新打开链接。"'),
    ('"This device\'s browser is too old for the 3D graphics in Turbo Tails.', '"这台设备的浏览器太旧，跑不动夜校 GP 的 3D 画面。'),
    ('"This device\'s graphics could not keep Turbo Tails running.', '"这台设备的显卡带不动夜校 GP。'),
    ('title:"Turbo Tails",text:"Race me in T', 'title:"夜校 GP",text:"来四明山和我跑一圈！'),
    ('"TAP FOR RACE ":"PRESS ENTER FOR RACE "', '"点按 · 下一赛 ":"按回车 · 下一赛 "'),
    ('"+(r?" \\xB7 RACE "+(i.i+1)+" OF 3":"")', '"+(r?" · 第 "+(i.i+1)+" / 3 赛":"")'),
    ('?" FOR A NEW GRAND PRIX"', '?" · 新开一局夜校杯"'),
    ('"GRAND PRIX"+', '"夜校杯"+'),
    ('"YOU WIN!"', '"你赢了！"'),
    ('"FINAL LAP!"', '"最后一圈！"'),
    ('("LAP "+s.lap,"",1.6)', '("第 "+s.lap+" 圈","",1.6)'),
    ('S.hud.count("GO!",!0)', 'S.hud.count("出发！",!0)'),
    ('"点按涡轮 FOR A BURST"', '"点按涡轮加速"'),
    ('"SHIFT = TURBO"', '"SHIFT = 涡轮"'),
    ('"E = USE ITEM"', '"E = 使用道具"'),
    ('"TAP ITEM TO USE IT"', '"点按道具使用"'),
    ('"HOST LEFT \\xB7 CPU TAKES OVER"', '"房主离开 · 电脑接管"'),
    ('"THIS BROWSER CANNOT JOIN ROOMS"', '"此浏览器无法加入房间"'),
    ('"THIS ROOM IS FULL (6 RACERS)"', '"房间已满（6 人）"'),
    ('"CANNOT REACH THE MATCHMAKER. RETRYING\\u2026"', '"连不上匹配服务器，重试中…"'),
    ('"OPENING THE ROOM\\u2026"', '"正在开房…"'),
    ('+" RACERS IN THE ROOM"', "+' 人在房间里'"),
    ('"SEND THE LINK. FRIENDS SHOW UP HERE."', '"把链接发给朋友，他们会出现在这里。"'),
    ('"JOINING THE ROOM\\u2026"', '"加入房间中…"'),
    ('"THE HOST DROPPED OUT. YOU HOST NEXT IF THEY STAY AWAY."', '"房主掉线了。他们不再回来，下一场由你开房。"'),
    ('"THE HOST DROPPED OUT. HOLDING THE ROOM\\u2026"', '"房主掉线，房间保留中…"'),
    ('"NO ROOM WITH THIS CODE YET. CHECK THE LINK WITH YOUR FRIEND."', '"还没找到这个房号。跟朋友核对一下链接。"'),
    ('"LOOKING FOR THE ROOM. IS THE HOST\\u2019S GAME OPEN?"', '"正在找房。房主的游戏开着吗？"'),
    ('"RACE IN PROGRESS. YOU ARE IN THE NEXT ONE."', '"比赛进行中，你排下一场。"'),
    ('"WAITING FOR THE HOST TO START"', '"等待房主开始"'),
    ('"WAITING FOR THE OTHER RACERS\\u2026"', '"等待其他选手…"'),
    ('"WAITING FOR THE HOST\\u2026"', '"等待房主…"'),
    ('"HOST STARTS RACE "', '"房主开始第 "'),
    ('" IS TAKEN BY "', '" 已被 "'),
    ('"A FRIEND"', '"朋友"'),
    ('". PICK ANOTHER RACER."', '"，选别的车手。"'),
    ('"THE HOST LEFT. YOU ARE THE HOST NOW."', '"房主离开，你现在就是房主。"'),
    ('" IS TAKEN. YOU ARE "', '" 已被选走。你是 "'),
    ('+" LEFT"', "+' 离开了'"),
    ('"LEAVE RACE"', '"离开比赛"'),
    ('"SOUND: OFF":"SOUND: ON"', '"声音：关":"声音：开"'),
    ('"LINK COPIED"', '"链接已复制"'),
    ('"SEND INVITE LINK"', '"发送邀请链接"'),
    # 赛道地标横幅（第三批）
    ('"BEHIND THE FALLS!"', '"瀑布背后！"'),
    ('"BOULDERS! DODGE!"', '"落石！闪避！"'),
    ('"BRIDGE OUT! JUMP!"', '"桥断了！跳！"'),
    ('"BOULDER RUN"', '"滚石段"'),
    ('"CANOPY ROAD"', '"树冠道"'),
    ('"CLOUD HOP"', '"云端跳"'),
    ('"CORKSCREW!"', '"螺旋弯！"'),
    ('"CRATER RIM"', '"火山口沿"'),
    ('"CRYSTAL CAVE"', '"水晶洞"'),
    ('"DOLPHIN LAGOON"', '"海豚湖"'),
    ('"EMBER COAST"', '"余烬海岸"'),
    ('"FINAL STRAIGHT"', '"最后直道"'),
    ('"INTO THE TREETOPS!"', '"冲上树冠！"'),
    ('"LANTERN PIER"', '"灯柱码头"'),
    ('"LAVA FALLS"', '"熔岩瀑"'),
    ('"LONG WAY DOWN!"', '"下面可深了！"'),
    ('"LOOP THE LOOP!"', '"回旋环！"'),
    ('"MUD MARSH"', '"泥沼"'),
    ('"PALM HILL"', '"棕榈山"'),
    ('"RAINBOW RISE"', '"彩虹坡"'),
    ('"RING LEAP"', '"光环跳"'),
    ('"RIVER RAPIDS!"', '"激流！"'),
    ('"RIVER RAPIDS"', '"激流段"'),
    ('"ROAD OUT! JUMP!"', '"路断了！跳！"'),
    ('"ROPE BRIDGE"', '"绳桥"'),
    ('"SHIPWRECK COVE"', '"沉船湾"'),
    ('"SHIPWRECK JUMP!"', '"沉船飞跃！"'),
    ('"SKY DIVE! CAUGHT YOU!"', '"天降！接住了！"'),
    ('"SKY DIVE"', '"天降段"'),
    ('"SOUND: OFF"', '"声音：关"'),
    ('"SOUND: ON"', '"声音：开"'),
    ('"\\u{1F507} Sound off"', '"\\u{1F507} 静音"'),
    ('"PRESS ENTER TO RACE AGAIN"', '"按回车再来一局"'),
    # DOM 标签（键名保护：只替换节点文本形态）
    ('>ENTER<', '>回车<'),
    ('>START<', '>开始<'),
    ('>RACER<', '>选车<'),
    ('>SOUND<', '>声音<'),
    ('>LAP<', '>圈<'),
    ('>CORAL COVE<', '>灯火湾<'),
    ('>THUNDER TEMPLE<', '>提示词丛林<'),
    ('>MAGMA PEAK<', '>算力火山<'),
    ('>SKY CASTLE<', '>云端城堡<'),
    ('>BEACH<', '>海滩<'),
    ('>JUNGLE<', '>丛林<'),
    ('>VOLCANO<', '>火山<'),
    ('>FINALE<', '>决赛<'),
    ('>ROOM<', '>房间<'),
    ('>LEAVE<', '>离开<'),
    ('>GRAND PRIX<', '>夜校杯<'),
    ('>DRAG<', '>拖动<'),
    ('>Steer<', '>转向<'),
    ('>DRIFT<', '>漂移<'),
    ('>ITEM<', '>道具<'),
    ('>BRAKE<', '>刹车<'),
    ('>TURBO<', '>涡轮<'),
    ('>Mute<', '>静音<'),
    ('>Drive<', '>开车<'),
    # 字体栈补 CJK
    ('--f: "Arial Rounded MT Bold", "SF Pro Rounded", ui-rounded, "Avenir Next", system-ui, sans-serif',
     '--f:"Arial Rounded MT Bold","SF Pro Rounded",ui-rounded,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Avenir Next",system-ui,sans-serif'),
]

report = []
for old, new in R:
    n = s.count(old)
    if n:
        s = s.replace(old, new)
    report.append((n, old[:44], new[:30]))
# 加载标签（DOM 文本节点，含空白变体）
s, n_loading = re.subn(r'>\s*Loading\s*<', '>加载中…<', s)
report.append((n_loading, 'DOM Loading 标签', '加载中…'))

# FINALE loading 文案（正则兜底）
s, n = re.subn(r'("(?:[^"]*FINALE[^"]*"?)","[^"]*")', lambda m: m.group(1), s, count=0)  # 占位：不改动键
m = re.search(r'name:"FINALE",sub:"([^"]*)",loading:\[([^\]]*)\]', s)
if m:
    old_block = m.group(0)
    new_block = 'name:"FINALE",sub:"云端城堡 GP",loading:["架起云端城堡","点亮最后的天梯"]'
    s = s.replace(old_block, new_block)
    report.append((1, 'FINALE sub/loading', '已替换'))

# ---------- 拆分资产/音乐脚本（单文件 35MB 超 CF 25MiB 限制） ----------
def grab(script_html, marker):
    i = script_html.find(marker)
    assert i != -1, marker
    j = script_html.find('</script>', i)
    return script_html[i:j]

scripts = re.findall(r'<script>(.*?)</script>', s, re.S)
assets_body = next(x for x in scripts if 'window.ASSETS' in x)
music_body = next(x for x in scripts if 'window.MUSIC' in x)
keep_scripts = [x for x in scripts if x is not assets_body and x is not music_body]
# 其余内联脚本（缩略图 + 游戏逻辑）保留在 HTML 内
head = s[:s.find('<script>')]
tail = s[s.find('<script>'):]
# 从 tail 中移除两个资产脚本块，并在原位置插入外链
tail = tail.replace('<script>' + assets_body + '</script>', '<script src="gp-assets.js"></script>')
tail = tail.replace('<script>' + music_body + '</script>', '<script src="gp-music.js"></script>')
assert 'gp-assets.js' in tail and 'gp-music.js' in tail
s2 = head + tail

open(OUT_HTML, 'w', encoding='utf-8').write(s2)
open(OUT_ASSETS, 'w', encoding='utf-8').write(assets_body + '\n')
open(OUT_MUSIC, 'w', encoding='utf-8').write(music_body + '\n')

# ---------- 校验 ----------
print('== 替换统计（0 次的为未命中，需人工核查） ==')
miss = 0
for n, old, new in report:
    if n == 0:
        print('  MISS:', repr(old)); miss += 1
print(f'  命中 {len(report) - miss}/{len(report)}，未命中 {miss}')
leftovers = [k for k in ['TURBO TAILS', 'WILD ISLE', 'GRAND PRIX', 'CORAL COVE', 'THUNDER TEMPLE',
                         'MAGMA PEAK', 'SKY CASTLE', 'SINGLE PLAYER', 'CHOOSE YOUR RACER',
                         'TURBO CHILI', 'HOMING ROCKET', 'DURIAN TRAP', 'BUBBLE SHIELD', 'the Penguin'] if k in s2]
print('残留英文品牌串:', leftovers or '无')
for p in [OUT_HTML, OUT_ASSETS, OUT_MUSIC]:
    print(os.path.basename(p), round(os.path.getsize(p) / 1048576, 2), 'MB', '(限额 25 MiB)')
print('DONE')
