---
layout: page
title: "Write-ups"
permalink: /writeups/
---

# 🚩 Write-ups

<style>
  .btn-group { display: flex; gap: 10px; margin-bottom: 20px; }
  .platform-btn {
    padding: 10px 20px;
    border: none;
    background-color: #2e3440;
    color: white;
    cursor: pointer;
    border-radius: 5px;
    font-weight: bold;
    transition: 0.3s;
  }
  .platform-btn:hover { background-color: #4c566a; }
  .platform-btn.active { background-color: #5e81ac; }
  .writeup-list { display: none; margin-top: 20px; }
  .writeup-list.active { display: block; }
</style>

<div class="btn-group">
  <button class="platform-btn" onclick="showPlatform('htb')">Hack The Box</button>
  <button class="platform-btn" onclick="showPlatform('thm')">TryHackMe</button>
</div>

<div id="htb" class="writeup-list">
  <h2>📦 Hack The Box</h2>
  <ul>
    <li><a href="/writeups/htb-darkzero">**DarkZero**</a></li>
    <li><a href="/writeups/htb-support">**Support**</a></li>
    <li><a href="/writeups/htb-archetype">**Archetype**</a></li>
  </ul>
</div>

<div id="thm" class="writeup-list">
  <h2>🧑‍💻 TryHackMe</h2>
  <ul>
    <li><a href="/writeups/thm-attacktive-directory">**Attacktive Directory**</a></li>
    <li><a href="/writeups/thm-soupedecode-01">**Soupedecode_01**</a></li>
    <li><a href="/writeups/thm-vulnnet-roasted">**VulnNet: Roasted**</a></li>
    <li><a href="/writeups/thm-vulnnet-active">**VulnNet: Active**</a></li>
    <li><a href="/writeups/thm-razorblack">**RazorBlack**</a></li>
  </ul>
</div>

<script>
  function showPlatform(platformId) {
    document.querySelectorAll('.writeup-list').forEach(list => {
      list.classList.remove('active');
    });
    document.querySelectorAll('.platform-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(platformId).classList.add('active');
    event.currentTarget.classList.add('active');
  }
</script>
