# 端對端測試：python tools/e2e_poster.py [輸出資料夾]（需先開 8890；線上版設 CPM_BASE）
# 登入序號用 page.route 假造授權回應：FLf9M6zAX8pe／GOOD＝有效、OLD＝過期、FULL＝額滿、其他＝查無（不會碰到真的試算表）
import os, sys, io, json, zipfile, asyncio
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
from playwright.async_api import async_playwright

BASE = os.environ.get('CPM_BASE', 'http://localhost:8890/')
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.environ.get('TEMP', '.'), 'cpm_e2e')
os.makedirs(OUT, exist_ok=True)
fails = []
def check(c, msg):
    print(('✓ ' if c else '✗ ') + msg)
    if not c: fails.append(msg)

JSQR = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
SCAN = '''async (size) => {
  if(!window.jsQR) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = '%s'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  await window._cpm.redraw();
  const c = window._cpm.fullCanvas(size), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height);
  const r = jsQR(d.data, c.width, c.height);
  return r ? r.data : null;
}''' % JSQR

LIC = 'https://script.google.com/macros/s/AKfycbw2qz-sTKRVkVHGQZLTj73xlJdDiaHG8eNexjAN9XWMrly5BnxVcP8dC0qE3kADHeIl/exec'
LIC_REQ = []
async def fake_license(route):
    try: body = json.loads(route.request.post_data or '{}')
    except Exception: body = {}
    LIC_REQ.append(body)
    sn = body.get('serial', '')
    if body.get('release'): r = {'ok': True}
    elif sn in ('FLf9M6zAX8pe', 'GOOD'): r = {'valid': True, 'reason': 'ok', 'activatedAt': '2026-11-16T16:00:00.000Z', 'expiresAt': '2027-05-16T16:00:00.000Z', 'headcountLimit': 10, 'headcountUsed': 1, 'headcountRemaining': 9}
    elif sn == 'OLD': r = {'valid': False, 'reason': 'expired', 'expiresAt': '2026-01-01T16:00:00.000Z'}
    elif sn == 'FULL': r = {'valid': False, 'reason': 'headcount_exceeded', 'message': '已達上限', 'headcountLimit': 10, 'headcountUsed': 10, 'headcountRemaining': 0}
    else: r = {'valid': False, 'reason': 'serial_not_found'}
    await route.fulfill(status=200, content_type='application/json', body=json.dumps(r))

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1400, 'height': 950}, accept_downloads=True)
        await ctx.route(LIC + '*', fake_license)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'visitor-badge' not in m.text and 'script.google' not in m.text else None)
        await pg.goto(BASE)
        await pg.wait_for_function('window._cpm')

        # 登入序號閘門
        check(await pg.is_visible('#entryGate') and not await pg.evaluate('window._cpm.gateOpen'), '沒登入：閘門擋住整個工具')
        check(not await pg.is_visible('#modal.show'), '沒登入時不先跳警語')
        check(await pg.text_content('#gateFreeCode') == 'FLf9M6zAX8pe', '登入頁顯示免費試用序號')
        check(await pg.get_attribute('#entryGateSerial', 'type') == 'password', '序號輸入框預設遮住')
        await pg.click('#btnEntryGateConfirm')
        check('請輸入登入序號' in await pg.text_content('#entryGateStatus'), '空白序號：提示要輸入')
        await pg.fill('#entryGateSerial', 'WRONG')
        await pg.click('#btnEntryGateConfirm')
        await pg.wait_for_function('document.getElementById("entryGateStatus").textContent.includes("查無")')
        check(await pg.is_visible('#entryGate'), '錯的序號：顯示查無、仍擋住')
        check(LIC_REQ and LIC_REQ[-1].get('sheet') == '課程招生海報產生器', '驗證請求帶分頁「課程招生海報產生器」')
        await pg.fill('#entryGateSerial', 'OLD'); await pg.click('#btnEntryGateConfirm')
        await pg.wait_for_function('document.getElementById("entryGateStatus").textContent.includes("過期")')
        check(await pg.is_visible('#entryGate'), '過期序號：擋住')
        await pg.fill('#entryGateSerial', 'FULL'); await pg.click('#btnEntryGateConfirm')
        await pg.wait_for_function('document.getElementById("entryGateHeadcount").textContent.includes("上限")')
        check(await pg.is_visible('#entryGate'), '額滿：顯示人數上限、擋住')
        await pg.click('#btnGateFreeCopy')
        try: await pg.wait_for_function('document.getElementById("btnGateFreeCopy").textContent.includes("已複製")', timeout=3000)
        except Exception: pass
        check('已複製' in await pg.text_content('#btnGateFreeCopy'), '複製免費序號按鈕有回饋')
        await pg.click('#btnGateFree')
        await pg.wait_for_function('window._cpm.gateOpen')
        check(not await pg.is_visible('#entryGate') and await pg.evaluate('localStorage.getItem("cpmEntrySerial")') == 'FLf9M6zAX8pe', '用免費序號登入：解鎖並記住序號')
        lt = await pg.text_content('#licTop')
        check(await pg.is_visible('#licTop') and '2027/5/17' in lt, '上方顯示序號到期日：' + lt)
        check(await pg.is_visible('#modal.show') and '使用警語' in await pg.text_content('#modalBox'), '首訪跳出使用警語')
        await pg.click('#modal [data-act=close]')
        check(await pg.evaluate('window._cpm.S.course.title') == 'AI 辦公室應用實務班', '第一次打開先放範例一')
        await pg.evaluate('window._cpm.redraw()')
        check(await pg.is_visible('.top a[href="manual.html"]') and await pg.is_visible('.foot a[href="manual.html#creator"]') and await pg.is_visible('.foot [data-act=install]') and await pg.locator('.foot img[src*="coursepostermaker"]').count() == 1, '頁面有操作手冊、創作者資訊、加入主畫面、訪客計數器')
        check(await pg.is_visible('.warn-line [data-act=warn]'), '頁面上看得到使用警語入口')
        check(await pg.locator('canvas[data-thumb]').count() == 6, '6 個版型縮圖')
        sizes = await pg.evaluate('[...document.querySelectorAll("canvas[data-thumb]")].map(c=>c.width>0)')
        check(all(sizes), '縮圖都有畫出來')

        # PNG 下載
        async with pg.expect_download() as dl:
            await pg.click('[data-act=png]')
        d = await dl.value
        fn = os.path.join(OUT, d.suggested_filename); await d.save_as(fn)
        from PIL import Image
        im = Image.open(fn)
        check(im.size == (2480, 3508) and fn.endswith('_A4.png'), 'A4 PNG 2480×3508：' + d.suggested_filename)

        # QR 掃得到
        url = await pg.evaluate('window._cpm.S.course.url')
        for sz in ['a4', 'ig45', 'ig11', 'story', 'fb', 'line']:
            got = await pg.evaluate(SCAN, sz)
            check(got == url, sz + ' 的 QR 用 jsQR 掃得到報名網址')

        # 每種尺寸 × 版型沒有爆框（範例一）
        warns = await pg.evaluate('''(async()=>{const o=[];for(const st of ["biz","pop","speaker","subsidy","list","note"]){await window._cpm.setPath("look.style",st);for(const sz of ["a4","ig45","ig11","story","fb","line"]){const c=window._cpm.fullCanvas(sz);if(c._warn.length)o.push(st+"/"+sz+":"+c._warn.join(","));}}await window._cpm.setPath("look.style","subsidy");return o;})()''')
        check(not warns, '範例一 36 種組合都沒有文字爆框 ' + str(warns))

        # ZIP
        async with pg.expect_download(timeout=60000) as dl:
            await pg.click('[data-act=zip]')
        d = await dl.value
        zf = os.path.join(OUT, 'all.zip'); await d.save_as(zf)
        z = zipfile.ZipFile(zf)
        names = z.namelist()
        check(len(names) == 7 and sum(n.endswith('.png') for n in names) == 6 and any(n.endswith('貼文文案.txt') for n in names), 'ZIP 有 6 張 PNG＋貼文文案：' + ', '.join(names))
        story = [n for n in names if '限時動態' in n][0]
        check(Image.open(z.open(story)).size == (1080, 1920), '限時動態 1080×1920')
        check(z.testzip() is None, 'ZIP 檔案完整')

        # 列印 PDF
        await pg.evaluate('window._cpm.preparePrint("a4")')
        pdf = await pg.pdf(prefer_css_page_size=True, print_background=True)
        open(os.path.join(OUT, 'a4.pdf'), 'wb').write(pdf)
        check(pdf.count(b'/Type /Page\n') + pdf.count(b'/Type /Page>') + pdf.count(b'/Type /Page ') >= 1 and pdf.count(b'/Type /Pages') >= 1, 'A4 列印 PDF 產生')
        try:
            import fitz
            doc = fitz.open(stream=pdf, filetype='pdf')
            r = doc[0].rect
            check(doc.page_count == 1 and abs(r.width - 595) < 3 and abs(r.height - 842) < 3, 'A4 列印剛好 1 頁 A4 直式（%d 頁 %.0f×%.0f）' % (doc.page_count, r.width, r.height))
            doc[0].get_pixmap(dpi=60).save(os.path.join(OUT, 'a4_pdf.png'))
        except ImportError:
            print('（沒有 PyMuPDF，略過 PDF 頁數檢查）')
        await pg.evaluate('window._cpm.preparePrint("a6")')
        check(await pg.locator('#printArea .grid4 img').count() == 4, 'A6 傳單一頁 4 張')
        pdf6 = await pg.pdf(prefer_css_page_size=True, print_background=True)
        open(os.path.join(OUT, 'a6.pdf'), 'wb').write(pdf6)
        try:
            import fitz
            doc = fitz.open(stream=pdf6, filetype='pdf')
            check(doc.page_count == 1, 'A6 傳單 PDF 1 頁')
            doc[0].get_pixmap(dpi=60).save(os.path.join(OUT, 'a6_pdf.png'))
        except ImportError: pass
        await pg.evaluate('document.getElementById("printArea").innerHTML=""')

        # 文字太多警告
        await pg.click('[data-size=fb]')
        await pg.evaluate('window._cpm.setPath("course.title", "非常非常長的課程名稱".repeat(12))')
        await pg.wait_for_timeout(300)
        check('課程名稱' in await pg.evaluate('window._cpm.LAST.warn.join()') and '文字太多' in await pg.text_content('#pvinfo'), '標題太長：預覽提醒文字太多')
        c = await pg.evaluate('window._cpm.fullCanvas("fb")._warn')
        check('課程名稱' in c, '下載版也偵測得到（但不畫紅框）')

        # 範例切換、表單輸入、線上切換
        await pg.click('[data-ex=talk]')
        check(await pg.evaluate('window._cpm.S.look.style') == 'speaker' and await pg.evaluate('window._cpm.S.size') == 'ig45', '點範例二：講師版型＋IG 貼文')
        await pg.fill('[data-b="course.title"]', '測試課程名稱')
        await pg.wait_for_timeout(250)
        check(await pg.evaluate('window._cpm.S.course.title') == '測試課程名稱', '輸入框綁定狀態')
        await pg.click('[data-card=when] summary')
        await pg.check('[data-b="course.online"]')
        check('上課方式' in await pg.text_content('[data-card=when]'), '勾線上課程：地點欄改成上課方式')
        await pg.click('[data-act=suggest]')
        check(await pg.locator('#sugg .chip').count() >= 3, '標題建議出現')
        await pg.locator('#sugg .chip').first.click()
        check(await pg.evaluate('window._cpm.S.course.title') != '測試課程名稱', '點標題建議會換上去')

        # 配色、自訂色、字型、版型
        await pg.click('[data-pal=green]')
        check(await pg.evaluate('window._cpm.S.look.pal') == 'green', '換配色')
        await pg.click('[data-style=note]')
        check(await pg.evaluate('window._cpm.S.look.font') == 'kai', '手寫筆記自動換楷書')

        # 範本
        await pg.click('[data-card=ex] summary') if not await pg.is_visible('[data-act=saveTpl]') else None
        await pg.click('[data-act=saveTpl]')
        await pg.fill('#tplName', '我的協會')
        await pg.click('[data-act=tplOk]')
        await pg.click('[data-ex=craft]')
        await pg.click('[data-tpl="0"]')
        check(await pg.evaluate('window._cpm.S.unit.name') == '示範青年創業協會', '存範本→換範例→套用範本還原')

        # 新海報保留單位
        await pg.click('[data-act=new]')
        check(await pg.evaluate('window._cpm.S.course.title') == '' and await pg.evaluate('window._cpm.S.unit.name') == '示範青年創業協會', '新海報清空課程、保留主辦單位')

        # AI：沒金鑰提示、貼上回覆
        await pg.click('[data-ex=tims]')
        await pg.click('[data-card=ai] summary')
        await pg.click('[data-act=aiGo]')
        check(await pg.is_visible('#modal.show') and await pg.locator('.set-sec[data-sec=ai][open]').count() == 1, '沒金鑰按 AI：打開 AI 設定')
        await pg.click('#modal [data-act=close]')
        await pg.click('[data-act=aiPaste]')
        await pg.fill('#aiPasteBox', '好的：{"title":"**AI 讓你準時下班**","sub":"簡報報表一次搞定","points":["一","二","三"],"who":"上班族","hashtags":["AI","下班"]}')
        await pg.click('[data-act=aiPasteOk]')
        check(await pg.is_visible('.airesult'), '貼上 AI 回覆顯示結果')
        await pg.click('[data-aiapply=all]')
        st = await pg.evaluate('window._cpm.S.course')
        check(st['title'] == 'AI 讓你準時下班' and st['points'] == '一\n二\n三' and st['fee'] == '8000', 'AI 全部套用：文案換掉、費用不動')

        # 分享連結
        share = await pg.evaluate('window._cpm.shareUrl()')
        pg2 = await ctx.new_page()
        await pg2.goto(share)
        await pg2.wait_for_function('window._cpm && window._cpm.gateOpen')
        await pg2.wait_for_timeout(300)
        check(await pg2.evaluate('window._cpm.S.course.title') == 'AI 讓你準時下班' and '#p=' not in pg2.url, '分享連結在新分頁還原，網址列清掉 #p=')
        await pg2.close()

        # 從訓練證書帶入
        await pg.evaluate('''localStorage.setItem("tcg.state", JSON.stringify({unit:{name:"證書協會",tel:"(02)1111-2222",logo:""},course:{name:"證書課程班",start:"2027-02-06",end:"2027-03-06",hours:"18",place:"證書教室"}}))''')
        await pg.reload(); await pg.wait_for_function('window._cpm && window._cpm.gateOpen')
        check(not await pg.is_visible('#modal.show'), '重新整理：自動登入、警語不再跳')
        await pg.click('[data-card=ex] summary') if not await pg.is_visible('[data-act=cert]') else None
        check(await pg.is_visible('[data-act=cert]'), '有訓練證書資料時出現帶入按鈕')
        await pg.click('[data-act=cert]')
        s = await pg.evaluate('window._cpm.S')
        check(s['unit']['name'] == '證書協會' and s['course']['title'] == '證書課程班' and s['course']['dateStart'] == '2027-02-06' and s['course']['hours'] == '18', '帶入單位、課程、日期、時數')
        await pg.evaluate('localStorage.removeItem("tcg.state")')

        # 圖片上傳（Logo、講師照）
        from PIL import Image as I2
        lp = os.path.join(OUT, 'logo.png'); I2.new('RGBA', (900, 300), (30, 80, 160, 255)).save(lp)
        pp = os.path.join(OUT, 'photo.jpg'); I2.new('RGB', (1200, 1600), (200, 150, 120)).save(pp)
        await pg.click('[data-card=unit] summary')
        await pg.set_input_files('[data-img="unit.logo"]', lp)
        await pg.wait_for_timeout(400)
        await pg.click('[data-card=spk] summary')
        await pg.set_input_files('[data-img="course.spkPhoto"]', pp)
        await pg.wait_for_timeout(400)
        s = await pg.evaluate('window._cpm.S')
        check(s['unit']['logo'].startswith('data:image/png') and s['course']['spkPhoto'].startswith('data:image/jpeg'), 'Logo（PNG 保留透明）與講師照（JPG）上傳')
        await pg.evaluate('window._cpm.redraw()')
        got = await pg.evaluate(SCAN, 'a4')
        check(got is not None, '放了 Logo 和照片 QR 仍掃得到')

        # ⚙ 常用設定收合
        await pg.click('.top [data-act=settings][aria-label]')
        secs = await pg.evaluate('[...document.querySelectorAll(".set-sec")].map(d=>d.dataset.sec)')
        check(secs == ['lic', 'view', 'ai', 'tpl', 'wipe', 'about'], '常用設定收合區塊 ' + str(secs))
        await pg.click('#modal [data-act=close]')
        await pg.click('#licTop')
        await pg.wait_for_timeout(200)
        check(await pg.locator('.set-sec[data-sec=lic]').count() == 1 and '2027/5/17' in await pg.text_content('.set-sec[data-sec=lic] summary'), '點到期日開 ⚙，登入序號區顯示到期日')
        await pg.click('#modal [data-act=close]')

        # 375px
        m = await ctx.new_page()
        await m.set_viewport_size({'width': 375, 'height': 800})
        await m.goto(BASE); await m.wait_for_function('window._cpm && window._cpm.gateOpen'); await m.evaluate('window._cpm.redraw()')
        ow = await m.evaluate('document.documentElement.scrollWidth')
        check(ow <= 376, '375px 手機沒有橫向捲動（%d）' % ow)
        await m.screenshot(path=os.path.join(OUT, 'mobile.png'))
        await m.close()

        await pg.screenshot(path=os.path.join(OUT, 'desktop.png'))

        # 清除全部資料不會登出；登出要重新輸入
        await pg.evaluate('window._cpm.ACT.wipeOk()')
        check(await pg.evaluate('window._cpm.gateOpen') and await pg.evaluate('localStorage.getItem("cpmEntrySerial")') == 'FLf9M6zAX8pe', '清除全部資料不會登出')
        await pg.click('.top [data-act=settings][aria-label]')
        await pg.click('.set-sec[data-sec=lic] summary')
        await pg.click('[data-act=logout]')
        check(await pg.is_visible('#entryGate') and not await pg.evaluate('window._cpm.gateOpen') and await pg.evaluate('localStorage.getItem("cpmEntrySerial")') is None, '登出：回到閘門、序號清掉')
        check(any(r.get('release') and r.get('sheet') == '課程招生海報產生器' for r in LIC_REQ), '登出時送出釋出名額（帶分頁）')
        await pg.fill('#entryGateSerial', 'GOOD'); await pg.press('#entryGateSerial', 'Enter')
        await pg.wait_for_function('window._cpm.gateOpen')
        check(not await pg.is_visible('#entryGate'), '輸入序號按 Enter 也能登入')
        gm = await ctx.new_page()
        await gm.set_viewport_size({'width': 375, 'height': 800})
        await gm.evaluate('0')
        await gm.goto(BASE); await gm.wait_for_function('window._cpm')
        await gm.evaluate('localStorage.removeItem("cpmEntrySerial")'); await gm.reload(); await gm.wait_for_function('window._cpm')
        await gm.wait_for_timeout(300)
        gw = await gm.evaluate('document.documentElement.scrollWidth')
        check(await gm.is_visible('#entryGate') and gw <= 376, '375px 登入頁正常、無橫捲（%d）' % gw)
        await gm.screenshot(path=os.path.join(OUT, 'gate_mobile.png'))
        await gm.close()
        check(not errs, '沒有 console 錯誤 ' + str(errs[:3]))
        await b.close()
    print('\n%s %d 項失敗' % ('✗' if fails else '✓', len(fails)))
    sys.exit(1 if fails else 0)
asyncio.run(main())
