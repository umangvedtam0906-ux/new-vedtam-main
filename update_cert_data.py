#!/usr/bin/env python3
import os
import re
import json
import time
import html
import csv
import smtplib
import sqlite3
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from urllib.parse import urljoin, urlparse

try:
    import requests
except ImportError:
    print("[cert-updater] requests is required. Install with: pip install requests")
    import sys
    sys.exit(1)

def load_env():
    # Load .env file relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, val = line.split("=", 1)
                        key = key.strip()
                        val = val.strip().strip('"').strip("'")
                        os.environ[key] = val
        except Exception as e:
            print(f"[cert-updater] Warning: Could not load .env file: {e}")

load_env()

session = requests.Session()

HOME_URL = "https://www.cert-in.org.in/"
PORTAL_URL = "https://www.cert-in.org.in/s2cMainServlet?pageid=PUBWEL01"
ADV_LIST_URL = "https://www.cert-in.org.in/s2cMainServlet?pageid=PUBADVLIST"
OUTPUT_FILE = os.environ.get("OUTPUT_FILE", "cert-data.json")
YEAR_FILTER = "" # Removed to fetch all history
MAX_ENTRIES = 5000 # Increased to hold full history
DB_FILE = os.environ.get("DB_FILE", "subscribers.db")


def clean_html_to_text(html_content):
    html_content = re.sub(r'<script[\s\S]*?</script>', ' ', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'<style[\s\S]*?</style>', ' ', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'</?(?:div|p|br|h[1-6]|tr)[\s\S]*?>', '\n', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'</?li[\s\S]*?>', '\n• ', html_content, flags=re.IGNORECASE)
    html_content = re.sub(r'<[^>]+>', '', html_content)
    clean = html.unescape(html_content)
    clean = clean.replace('\r\n', '\n')
    clean = re.sub(r'\n{2,}', '\n', clean)
    return clean.strip()

def normalize_url(raw, base=HOME_URL):
    try:
        return urljoin(base, raw)
    except Exception:
        return None

def parse_code(url):
    m = re.search(r'(?:VLCODE|CACODE)=([A-Z0-9-]+)', url, re.IGNORECASE)
    return m.group(1) if m else None

def parse_severity(text):
    m1 = re.search(r'Severity\s+Rating\s*:\s*(Critical|High|Medium|Low)', text, re.IGNORECASE)
    if m1:
        return m1.group(1).lower()
    m2 = re.search(r'Risk\s+Assessment\s*:\s*(?:High|Critical)\s+risk', text, re.IGNORECASE)
    if m2:
        return "critical" if "critical" in m2.group(0).lower() else "high"
    if re.search(r'CICA-\d{4}-', text, re.IGNORECASE):
        return "high"
    return "high"

def parse_date(text):
    m = re.search(r'Original\s+Issue\s+Date\s*:?\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})', text, re.IGNORECASE)
    if m:
        date_str = re.sub(r'\s*,\s*', ', ', m.group(1))
        for fmt in ('%B %d, %Y', '%b %d, %Y', '%B %d %Y', '%b %d %Y'):
            try:
                parsed = datetime.strptime(date_str, fmt)
                return parsed.strftime('%Y-%m-%d')
            except ValueError:
                pass
    m2 = re.search(r'([A-Za-z]+\s+\d{1,2},?\s+\d{4})', text, re.IGNORECASE)
    if m2:
        date_str = re.sub(r'\s*,\s*', ', ', m2.group(1))
        for fmt in ('%B %d, %Y', '%b %d, %Y', '%B %d %Y', '%b %d %Y'):
            try:
                parsed = datetime.strptime(date_str, fmt)
                return parsed.strftime('%Y-%m-%d')
            except ValueError:
                pass
    return None

def parse_title(text):
    m1 = re.search(r'CERT-In\s+(?:Vulnerability\s+Note|Advisory)\s+[A-Z0-9-]+\s+(.+?)(?=\s+Original\s+Issue\s+Date:)', text, re.IGNORECASE)
    if m1:
        return m1.group(1).strip()
    m2 = re.search(r'(?:^|[\r\n])([A-Z][^.!?]{15,180})[\s\r\n]*Original\s+Issue\s+Date', text, re.IGNORECASE)
    if m2:
        return m2.group(1).strip()
    return None

def parse_summary(text):
    m = re.search(r'Overview\s+(.{40,600}?)(?=\s+(?:Target Audience|Risk Assessment|Description|Solution|References|$))', text, re.IGNORECASE | re.DOTALL)
    return m.group(1).strip() if m else None

def parse_software_affected(text):
    m = re.search(r'Software Affected([\s\S]+?)(?=Overview|Target Audience|Description|Risk Assessment)', text, re.IGNORECASE)
    if not m:
        return []
    block = m.group(1).strip()
    if block.startswith("• "):
        block = block[2:]
    items = []
    for s in re.split(r'\n•', block):
        cleaned = re.sub(r'\s+', ' ', s.replace('\n', ' ')).strip()
        if cleaned:
            items.append(cleaned)
    return items

def parse_field(text, label):
    escaped = re.escape(label)
    pattern = re.compile(
        f"{escaped}\\s*:?\\s*([\\s\\S]+?)(?=\\s*(?:Target Audience|Risk Assessment|Impact Assessment|Description|Solution|Vendor Information|References|Software Affected|Overview|$))",
        re.IGNORECASE
    )
    m = pattern.search(text)
    return re.sub(r'\s+', ' ', m.group(1).replace('\n', ' ')).strip() if m else ""

def parse_cves(text):
    found = re.findall(r'CVE-\d{4}-\d{4,7}', text, re.IGNORECASE)
    seen = set()
    result = []
    for c in found:
        c_upper = c.upper()
        if c_upper not in seen:
            seen.add(c_upper)
            result.append(c_upper)
    return result

def parse_solution_links(html_content):
    match = re.search(r'(?:Vendor Information|References)([\s\S]*?)Disclaimer', html_content, re.IGNORECASE)
    if not match:
        return []
    links = re.findall(r'(?:http|https)://[^\s<"\']+', match.group(1), re.IGNORECASE)
    valid = []
    seen = set()
    for l in links:
        norm = normalize_url(l)
        if norm and norm not in seen and not any(d in norm for d in ('cve.org', 'cve.mitre.org')):
            seen.add(norm)
            valid.append(norm)
    return valid[:8]

def fetch_text(url, retries=3, depth=0):
    if depth > 2:
        return "", url
        
    for attempt in range(retries):
        try:
            r = session.get(url, timeout=20)
            text = r.text
            
            if "<frameset" in text.lower():
                frames = re.findall(r'<frame[^>]+src=["\']([^"\']+)["\']', text, re.IGNORECASE)
                main_frame = None
                for f in frames:
                    if f and "about:blank" not in f:
                        main_frame = f
                        break
                if main_frame:
                    frame_url = urljoin(url, main_frame)
                    return fetch_text(frame_url, retries, depth + 1)
            
            return text, r.url
        except Exception as e:
            if attempt == retries - 1:
                return "", url
            time.sleep(1 * (attempt + 1))
    return "", url

def collect_advisory_urls():
    sources = [PORTAL_URL, ADV_LIST_URL]
    for y in range(2020, 2027):
        sources.append(f"https://www.cert-in.org.in/s2cMainServlet?pageid=VLNLIST02&year={y}")
        sources.append(f"https://www.cert-in.org.in/s2cMainServlet?pageid=PUBADVLIST02&year={y}")
        sources.append(f"https://xn----1td4etbxb9bwj.xn--h2brj9c/s2cMainServlet?pageid=VLNLIST02&year={y}")
    urls = []

    url_pattern = re.compile(
        rf"(?:href|HREF)\s*=\s*[\"']([^\"']*(?:s2cMainServlet\?[^\"']*(?:CIVN|CIAD|CICA)-\d{{4}}-|(?:CIVN|CIAD|CICA)-\d{{4}}-)[^\"']+)[\"']",
        re.IGNORECASE
    )
    js_pattern = re.compile(
        rf"callPage\s*\(\s*['\"](VulnerabilityNote|Advisory|CurrentActivities)['\"]\s*,\s*['\"]((?:CIVN|CIAD|CICA)-\d{{4}}-[^'\"]+)['\"]\s*\)",
        re.IGNORECASE
    )
    code_pattern = re.compile(rf"(?:CIVN|CIAD|CICA)-\d{{4}}-\d{{4}}", re.IGNORECASE)

    for src in sources:
        try:
            html_content, final_url = fetch_text(src)
            if not html_content:
                continue
            print(f"[cert-updater] Fetched {src}: {len(html_content)} chars")
            
            # 1. Match direct URLs
            for match in url_pattern.finditer(html_content):
                norm = normalize_url(match.group(1), src)
                if norm and norm not in urls:
                    urls.append(norm)

            # 2. Match JS calls
            for match in js_pattern.finditer(html_content):
                type_ = match.group(1)
                code = match.group(2)
                page_id = "PUBVLNOTES01"
                if type_ in ("Advisory", "CurrentActivities"):
                    page_id = "PUBADV01"

                constructed = f"s2cMainServlet?pageid={page_id}&VLCODE={code}"
                norm = normalize_url(constructed, src)
                if norm and norm not in urls:
                    urls.append(norm)

            # 3. Fallback
            raw_codes = code_pattern.findall(html_content)
            for code in set(raw_codes):
                page_id = "PUBADV01" if code.startswith("CIAD") else "PUBVLNOTES01"
                norm = normalize_url(f"s2cMainServlet?pageid={page_id}&VLCODE={code}", src)
                if norm and norm not in urls:
                    urls.append(norm)

            if len(urls) >= MAX_ENTRIES:
                break
        except Exception as e:
            print(f"[cert-updater] Warning: could not fetch index {src}: {e}")

    print(f"[cert-updater] Collected {len(urls)} raw URLs.")
    return urls[:MAX_ENTRIES]

def build_entry(url):
    try:
        html_content, final_url = fetch_text(url)
        if not html_content:
            return None
        
        text = clean_html_to_text(html_content)
        code = parse_code(url)
        date = parse_date(text)

        if not date:
            return None

        title = parse_title(text) or (f"CERT-In Advisory {code}" if code else "CERT-In Advisory")
        severity = parse_severity(text)
        summary = parse_summary(text) or "Multiple vulnerabilities reported."

        software_affected = parse_software_affected(text)
        target_audience = parse_field(text, "Target Audience")
        risk_assessment = parse_field(text, "Risk Assessment")
        impact_assessment = parse_field(text, "Impact Assessment")
        description = parse_field(text, "Description")
        cves = parse_cves(text)
        solution_links = parse_solution_links(html_content)

        entry = {
            "title": title,
            "severity": severity,
            "date": date,
            "link": url,
            "summary": summary,
            "description": description,
            "softwareAffected": software_affected,
            "targetAudience": target_audience,
            "riskAssessment": risk_assessment,
            "impactAssessment": impact_assessment,
            "cves": cves,
            "solutionLinks": solution_links
        }
        if code:
            entry["code"] = code
        return entry
    except Exception as e:
        print(f"[cert-updater] Error parsing {url}: {e}")
        return None

def get_confirmed_subscribers(db_path):
    subscribers = []
    if not os.path.exists(db_path):
        print(f"[cert-updater] Subscribers database not found: {db_path}")
        return subscribers

    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT name, email, token FROM subscribers WHERE status = 'confirmed'")
        for row in cursor.fetchall():
            subscribers.append({
                'name': row['name'],
                'email': row['email'],
                'token': row['token'] or ''
            })
        conn.close()
    except Exception as e:
        print(f"[cert-updater] Error reading subscribers database: {e}")
    
    return subscribers

def email_subscribers(new_advisories):
    # Load configuration
    smtp_host = os.environ.get("SMTP_HOST", "")
    smtp_port_str = os.environ.get("SMTP_PORT", "587")
    try:
        smtp_port = int(smtp_port_str)
    except ValueError:
        smtp_port = 587
        
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    smtp_secure = os.environ.get("SMTP_SECURE", "tls").lower() # ssl, tls, none
    
    from_email = os.environ.get("FROM_EMAIL", "certin-advisories@vedtam.io")
    from_name = os.environ.get("FROM_NAME", "Vedtam CERT-In Alerts")
    site_url = os.environ.get("SITE_URL", "https://vedtam.com")
    site_name = os.environ.get("SITE_NAME", "Vedtam Tech Solutions")
    db_path = os.environ.get("DB_FILE", DB_FILE)
    
    if not smtp_host or not smtp_user or not smtp_password:
        print("[cert-updater] SMTP host, user, or password not configured. Skipping email sending.")
        return
        
    subscribers = get_confirmed_subscribers(db_path)
    if not subscribers:
        print("[cert-updater] No confirmed subscribers found. Skipping email sending.")
        return
        
    print(f"[cert-updater] Emailing {len(subscribers)} subscribers via SMTP...")
    
    # Build advisory rows
    advisory_rows = ""
    for adv in new_advisories[:10]:
        severity = (adv.get("severity") or "").lower()
        if severity == "critical":
            sev_color = "#e63946"
        elif severity == "high":
            sev_color = "#f4842d"
        elif severity == "medium":
            sev_color = "#f9c74f"
        elif severity == "low":
            sev_color = "#06d6a0"
        else:
            sev_color = "#94a3b8"
            
        adv_id = adv.get("id") or str(adv.get("code") or "").lower().replace("/", "-").replace(" ", "-")
        link = f"{site_url}/cert-advisory#{adv_id}"
        title = html.escape(adv.get("title") or adv.get("code") or "Advisory")
        date_str = html.escape(adv.get("date") or "")
        sev_label = (adv.get("severity") or "INFO").upper()
        
        advisory_rows += f"""
        <tr>
          <td style="padding:10px 12px; border-bottom:1px solid #1e293b;">
            <a href="{link}" style="color:#fb923c; text-decoration:none; font-weight:600;">{title}</a>
          </td>
          <td style="padding:10px 12px; border-bottom:1px solid #1e293b; white-space:nowrap;">
            <span style="background:{sev_color}22; color:{sev_color}; padding:2px 8px; border-radius:4px; font-size:12px; font-weight:700;">{sev_label}</span>
          </td>
          <td style="padding:10px 12px; border-bottom:1px solid #1e293b; color:#94a3b8; white-space:nowrap; font-size:13px;">{date_str}</td>
        </tr>"""
        
    total_new = len(new_advisories)
    adv_word = "advisory" if total_new == 1 else "advisories"
    subject = f"CERT-In Alert: {total_new} New Security {adv_word.capitalize()} — Vedtam"
    year = datetime.now().year
    
    # Establish connection
    try:
        if smtp_secure == "ssl":
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=15)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
            if smtp_secure == "tls":
                server.starttls()
                
        server.login(smtp_user, smtp_password)
    except Exception as e:
        print(f"[cert-updater] Failed to connect or login to SMTP server: {e}")
        return
        
    for sub in subscribers:
        to_email = sub['email']
        to_name = html.escape(sub['name'])
        token = html.escape(sub.get('token', ''))
        unsub_link = f"{site_url}/unsubscribe.php?token={token}"
        
        body = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#3d3561,#2d2545);padding:28px 32px;text-align:center;">
            <p style="margin:0 0 4px 0;font-size:13px;color:rgba(255,255,255,0.5);letter-spacing:2px;text-transform:uppercase;">{site_name}</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#f8fafc;">CERT-In Security Alert</h1>
            <p style="margin:8px 0 0 0;font-size:13px;color:rgba(255,255,255,0.6);">{total_new} new {adv_word} published</p>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0;color:#e2e8f0;font-size:15px;">Hi <strong>{to_name}</strong>,</p>
            <p style="margin:12px 0 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
              CERT-In has published <strong style="color:#fb923c;">{total_new} new security {adv_word}</strong>.
              Here is a summary of the latest updates:
            </p>
          </td>
        </tr>

        <!-- Advisories Table -->
        <tr>
          <td style="padding:16px 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;overflow:hidden;font-size:14px;color:#e2e8f0;">
              <tr style="background:#1e293b;">
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Advisory</th>
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Severity</th>
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Date</th>
              </tr>
              {advisory_rows}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 28px;text-align:center;">
            <a href="{site_url}/cert-advisory" style="display:inline-block;background:linear-gradient(135deg,#fb923c,#f97316);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              View All Advisories &rarr;
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0f172a;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;">
            <p style="margin:0;color:#475569;font-size:12px;">
              You are receiving this because you subscribed to CERT-In alerts on {site_name}.<br>
              &copy; {year} {site_name} &middot; <a href="{site_url}/privacy-policy" style="color:#fb923c;text-decoration:none;">Privacy Policy</a><br>
              <a href="{unsub_link}" style="color:#94a3b8;text-decoration:underline;margin-top:8px;display:inline-block;">Unsubscribe</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
        
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        msg['List-Unsubscribe'] = f"<{unsub_link}>"
        
        # Plain text fallback
        plain_text = f"Hi {sub['name']},\n\nCERT-In has published {total_new} new security {adv_word}. View all advisories at: {site_url}/cert-advisory\n\nUnsubscribe: {unsub_link}"
        msg.attach(MIMEText(plain_text, 'plain', 'utf-8'))
        msg.attach(MIMEText(body, 'html', 'utf-8'))
        
        try:
            server.sendmail(from_email, [to_email], msg.as_string())
            print(f"[cert-updater] Email to {to_email}: sent")
        except Exception as ex:
            print(f"[cert-updater] Email to {to_email} FAILED: {ex}")
            
        time.sleep(0.2)
        
    try:
        server.quit()
    except Exception:
        pass

def main():
    global session
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
    })
    
    try:
        # Hit homepage first to satisfy WAF and get cookies
        print(f"[cert-updater] Initializing session with {HOME_URL}")
        r = session.get(HOME_URL, timeout=20)
        print(f"[cert-updater] Session init status: {r.status_code}, cookies: {session.cookies.get_dict()}")
        time.sleep(1)
        
        # Load existing advisories first to optimize crawling
        existing = []
        if os.path.exists(OUTPUT_FILE):
            try:
                with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                existing = []

        existing_links = {e.get("link") for e in existing if e.get("link")}
        existing_codes = {e.get("code") for e in existing if e.get("code")}

        urls = collect_advisory_urls()
        if not urls:
            print("[cert-updater] No URLs collected.")
            return

        # Filter out already existing URLs or codes to avoid redundant crawling
        filtered_urls = []
        for url in urls:
            code = parse_code(url)
            if url in existing_links:
                continue
            if code and code in existing_codes:
                continue
            filtered_urls.append(url)

        print(f"[cert-updater] Out of {len(urls)} collected URLs, {len(filtered_urls)} are new and will be crawled.")

        fresh_entries = []
        for index, url in enumerate(filtered_urls):
            print(f"[cert-updater] Crawling {index+1}/{len(filtered_urls)}: {url}")
            entry = build_entry(url)
            if entry:
                fresh_entries.append(entry)
            time.sleep(0.5)

        if not fresh_entries:
            print("[cert-updater] No new/fresh advisories found.")
            return
            
        # Sort fresh entries
        fresh_entries.sort(key=lambda x: x["date"], reverse=True)

        fresh_links = {e["link"] for e in fresh_entries}
        kept = [
            e for e in existing 
            if e.get("link") not in fresh_links
        ]

        merged = fresh_entries + kept
        merged.sort(key=lambda x: x.get("date", ""), reverse=True)
        merged = merged[:MAX_ENTRIES]

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2, ensure_ascii=False)
            f.write("\n")

        log_msg = f"[cert-updater] {datetime.now().isoformat()} — Saved {len(merged)} advisories ({len(fresh_entries)} fresh)."
        print(log_msg)
        try:
            with open("cert-update-log.txt", "a", encoding="utf-8") as f:
                f.write(log_msg + "\n")
        except Exception:
            pass

        # Email subscribers about the fresh advisories
        try:
            email_subscribers(fresh_entries)
        except Exception as mail_ex:
            print(f"[cert-updater] Error emailing subscribers: {mail_ex}")
            
    except Exception as e:
        print(f"[cert-updater] Critical error in main: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    main()
