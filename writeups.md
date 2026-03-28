---
layout: page
title: "Write-ups"
permalink: /writeups/
---

# 🚩 Security Lab Write-ups
> "Only Windows machines"

<style>
  .writeup-container {
    width: 100%;
    margin-top: 20px;
  }
  .btn-group { 
    display: flex; 
    gap: 15px; 
    margin-bottom: 30px;
    border-bottom: 2px solid #3b4252;
    padding-bottom: 10px;
  }
  .platform-btn {
    padding: 12px 24px;
    border: none;
    background-color: transparent;
    color: #d8dee9;
    cursor: pointer;
    font-size: 1.1rem;
    font-weight: 600;
    transition: all 0.3s ease;
    border-radius: 5px;
  }
  .platform-btn:hover { background-color: #3b4252; color: #eceff4; }
  .platform-btn.active { 
    background-color: #5e81ac; 
    color: white;
    box-shadow: 0 4px 15px rgba(94, 129, 172, 0.3);
  }
  
  .writeup-list { 
    display: none; 
    width: 100%; 
    animation: fadeIn 0.4s ease;
  }
  .writeup-list.active { display: block; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Style cho danh sách bên trong */
  .writeup-list ul { list-style: none; padding: 0; }
  .writeup-list li {
    background: #2e3440;
    margin-bottom: 10px;
    padding: 15px;
    border-radius: 8px;
    border-left: 5px solid #5e81ac;
    transition: transform 0.2s;
  }
  .writeup-list li:hover { transform: translateX(10px); background: #3b4252; }
  .writeup-list a { color: #88c0d0; text-decoration: none; font-weight: bold; }
</style>

<div class="writeup-container">
  <div class="btn-group">
    <button class="platform-btn" id="btn-htb" onclick="showPlatform('htb')">Hack The Box</button>
    <button class="platform-btn" id="btn-thm" onclick="showPlatform('thm')">TryHackMe</button>
  </div>

  <div id="htb" class="writeup-list">
    <h2 style="color: #a3be8c;">🏔️ Hack The Box</h2>
    <ul>
      <li><a href="/posts/htb-darkzero">DarkZero</a></li>
      <li><a href="/posts/htb-support">Support</a></li>
      <li><a href="/posts/htb-archetype">Archetype</a></li>
    </ul>
  </div>

  <div id="thm" class="writeup-list">
    <h2 style="color: #ebcb8b;">🏰 TryHackMe</h2>
    <ul>
      <li><a href="/posts/thm-attacktive-directory">Attacktive Directory</a></li>
      <li><a href="/posts/thm-soupedecode-01">Soupedecode 01</a></li>
      <li><a href="/posts/thm-vulnnet-roasted">VulnNet: Roasted</a></li>
      <li><a href="/posts/thm-vulnnet-active">VulnNet: Active</a></li>
      <li><a href="/posts/thm-razorblack">RazorBlack</a></li>
    </ul>
  </div>
</div>

<script>
  function showPlatform(platformId) {
    document.querySelectorAll('.writeup-list').forEach(list => list.classList.remove('active'));
    document.querySelectorAll('.platform-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(platformId).classList.add('active');
    
    if(platformId === 'htb') document.getElementById('btn-htb').classList.add('active');
    if(platformId === 'thm') document.getElementById('btn-thm').classList.add('active');
  }
  
  window.onload = function() { showPlatform('htb'); };
</script>
