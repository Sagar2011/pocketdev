// Original SVG artwork, animated with CSS. No external assets or animation runtime.
window.mountMascot = container => {
  container.innerHTML = `<svg class="original" viewBox="0 0 240 240" role="img" aria-label="PocketDev mini developer">
    <defs>
      <linearGradient id="jacket" x2="1" y2="1"><stop stop-color="#555e65"/><stop offset="1" stop-color="#303a42"/></linearGradient>
      <radialGradient id="skin" cx=".35" cy=".3" r=".8"><stop stop-color="#e2bea4"/><stop offset=".55" stop-color="#cda385"/><stop offset="1" stop-color="#a87d63"/></radialGradient>
    </defs>
    <ellipse cx="120" cy="219" rx="58" ry="5" fill="#24363c" opacity=".1"/>
    <g class="character" stroke-linecap="round" stroke-linejoin="round">
      <g class="standing-legs">
        <path d="M98 149 L94 207 L110 207 L119 163 L130 207 L146 207 L140 149Z" fill="#34424f"/>
        <path d="M104 161 L101 198 M133 162 L138 198" fill="none" stroke="#4b5863" stroke-width="2"/>
        <path d="M94 204 L109 204 L114 214 Q104 219 87 215 L88 210Z M131 204 L146 204 L158 211 L158 216 L131 216Z" fill="#e7e6e0" stroke="#899095" stroke-width="1"/>
        <path d="M87 215 L113 215 M132 216 L157 216" stroke="#54616a" stroke-width="2"/>
      </g>
      <g class="seated-legs">
        <path d="M102 155 L98 212 M140 155 L145 212" stroke="#738079" stroke-width="5"/>
        <rect x="92" y="151" width="58" height="7" rx="3" fill="#adb3a7"/>
        <path d="M102 146 Q81 147 79 168 L91 205 L105 202 L99 170 L119 163 L147 171 L145 204 L160 206 L167 166 Q160 149 138 146Z" fill="#34424f"/>
        <path d="M92 203 L104 201 L114 209 L112 216 L88 216 L86 210Z M145 202 L159 203 L171 211 L169 216 L143 216Z" fill="#e7e6e0" stroke="#899095" stroke-width="1"/>
      </g>
      <g class="torso">
        <path d="M111 84 L111 102 L132 102 L132 83Z" fill="#bb8b6d"/>
        <path d="M93 100 L111 94 L132 94 L149 102 L144 155 Q120 162 94 154Z" fill="url(#jacket)" stroke="#303941" stroke-width="1.2"/>
        <path d="M112 97 Q122 104 131 97 L130 148 L113 148Z" fill="#b9bbb5"/>
        <path d="M109 97 L111 110 L112 155 M134 97 L131 111 L130 155" fill="none" stroke="#727b7d" stroke-width="1.3"/>
        <path d="M99 137 L108 138 M135 138 L143 136" stroke="#202e38" stroke-width="1.4"/>
        <path d="M139 109 L143 109" stroke="#a5c7bd" stroke-width="2"/><path d="M97 117 L104 132 L98 146 M139 122 L135 140 L140 150" fill="none" stroke="#69727a" stroke-width=".8" opacity=".5"/>
      </g>
      <g class="head"><g class="face-detail">
        <ellipse cx="98" cy="60" rx="4" ry="7" fill="#ca9878"/><ellipse cx="144" cy="60" rx="4" ry="7" fill="#c19071"/>
        <path d="M99 43 Q98 27 119 26 Q141 26 144 43 L142 68 Q139 83 122 89 Q107 85 101 72Z" fill="url(#skin)"/>
        <path d="M99 58 Q90 34 104 25 Q117 15 134 25 Q151 29 145 56 L141 48 L138 37 Q121 44 105 38 L103 57Z" fill="#30383d"/>
        <path d="M105 30 Q119 24 135 30" fill="none" stroke="#4c5355" stroke-width="2"/>
        <path d="M105 52 L113 51 M129 51 L137 53" stroke="#594739" stroke-width="1.5"/>
        <g class="eyes"><path d="M105 58 Q110 54 115 58 Q110 61 105 58 M128 58 Q133 54 138 58 Q133 61 128 58" fill="#eee9df" stroke="#776352" stroke-width=".7"/><g fill="#39413f"><ellipse cx="110" cy="58" rx="1.5" ry="1.9"/><ellipse cx="133" cy="58" rx="1.5" ry="1.9"/></g></g>
        <path d="M121 56 L118 67 Q121 71 125 67" fill="#bd9175" stroke="#ad8067" stroke-width=".6"/><path d="M107 65 Q110 68 114 66 M130 66 Q135 68 138 64" fill="none" stroke="#b88d73" stroke-width=".7"/>
        <path class="mouth" d="M116 76 Q122 77.5 128 75.5" fill="none" stroke="#775647" stroke-width="1.4"/>
        <path d="M106 73 Q109 83 121 86 Q134 82 138 72" fill="none" stroke="#7f7163" stroke-width="2" opacity=".35"/>
      </g></g>
      <g class="pose pose-waiting">
        <path d="M95 104 Q81 117 92 141 L104 147" stroke="#424e57" stroke-width="13" fill="none"/>
        <g class="notepad"><rect x="98" y="125" width="37" height="49" rx="2" fill="#ede9dc" stroke="#a4a598" stroke-width="1" transform="rotate(-8 116 150)"/>
          <path d="M101 125 L101 132 M109 124 L109 131 M117 123 L117 130 M125 122 L125 129" stroke="#67716f" stroke-width="2"/>
          <path d="M106 141 L126 139 M107 150 L125 148 M108 159 L121 157" stroke="#c4c5b7" stroke-width="1"/>
          <ellipse cx="101" cy="147" rx="6" ry="4" fill="url(#skin)"/>
          <path d="M128 132 L126 161" stroke="#6e8176" stroke-width="2"/>
        </g>
        <g class="knocking-arm"><path d="M144 105 L158 120 L172 98" fill="none" stroke="#424e57" stroke-width="13"/>
          <path d="M168 99 L168 88 Q168 83 172 83 L180 84 Q184 85 183 90 L181 99 Q176 104 170 103Z" fill="url(#skin)"/>
          <path d="M172 86 L172 92 M176 86 L176 92 M180 88 L179 93" stroke="#ac7e62" stroke-width=".8"/>
        </g>
        <g class="knock-marks" stroke="#a99d78" stroke-width="1.7"><path d="M190 80 L196 77 M193 91 L201 91 M188 102 L195 105"/></g>
      </g>
      <g class="pose pose-working">
        <path d="M94 105 L106 132 L134 147" fill="none" stroke="#424e57" stroke-width="13"/>
        <g class="typing-right"><path d="M146 105 L159 127 L157 146" fill="none" stroke="#424e57" stroke-width="13"/><ellipse cx="157" cy="146" rx="7" ry="4" fill="url(#skin)"/></g>
        <path d="M61 160 L188 160 M70 163 L65 217 M178 163 L184 217" stroke="#66716e" stroke-width="3"/>
        <path d="M61 158 L189 158" stroke="#d0cabc" stroke-width="7"/>
        <path d="M66 118 L118 118 L128 151 L77 151Z" fill="#89969d" stroke="#52616b" stroke-width="1.4"/>
        <path d="M77 151 L171 151 L163 156 L81 156Z" fill="#c0c8cb" stroke="#65727a" stroke-width="1"/>
        <path d="M134 153 L155 153" stroke="#7b888e" stroke-width="1.2"/>
        <path d="M91 131 L96 127 M97 137 L102 132" stroke="#dce4e5" stroke-width="2"/>
        <g class="typing-left"><path d="M131 144 Q139 141 143 148 L132 150Z" fill="url(#skin)"/></g>
        <g class="typing-fingers"><path d="M154 144 Q163 141 168 148 L156 150Z" fill="url(#skin)"/></g>
        <g class="scratch-arm"><path d="M146 105 Q167 96 154 71 L145 59" stroke="#424e57" stroke-width="12" fill="none"/>
          <path class="scratch-hand" d="M142 65 Q136 59 140 53 L144 48 Q148 47 151 52 L151 60 L148 67Z" fill="url(#skin)"/>
        </g>
      </g>
      <g class="pose pose-done">
        <path d="M95 106 L85 136 L88 158" fill="none" stroke="#424e57" stroke-width="13"/><ellipse cx="89" cy="161" rx="5" ry="7" fill="url(#skin)"/>
        <g class="thumb-arm"><path d="M146 105 L160 124 L176 106" fill="none" stroke="#424e57" stroke-width="13"/>
          <path d="M172 109 L170 101 L174 94 L176 83 Q177 78 181 80 Q184 81 182 87 L181 96 L189 97 Q193 98 191 104 L189 111 Q180 115 175 112Z" fill="url(#skin)"/>
          <path d="M183 101 L190 103 M182 106 L189 107" stroke="#ad8164" stroke-width=".8"/>
        </g>
      </g>
      <g class="pose pose-idle">
        <path d="M95 105 Q80 123 96 145 L105 148" fill="none" stroke="#424e57" stroke-width="13"/>
        <g class="chipbag"><path d="M104 133 L134 130 L137 168 Q122 174 105 169Z" fill="#c5a169" stroke="#a48152" stroke-width="1"/>
          <path d="M104 134 L108 130 L112 133 L117 128 L122 131 L127 127 L131 131 L134 130" stroke="#eee1be" stroke-width="2" fill="none"/>
          <ellipse cx="121" cy="151" rx="9" ry="8" fill="#eee0b8"/><path d="M115 150 Q121 143 128 150 Q125 158 116 153" fill="#d2b16e"/>
          <path d="M109 165 L132 164" stroke="#a78655" stroke-width="1.2"/>
        </g>
        <ellipse cx="104" cy="149" rx="6" ry="4" fill="url(#skin)"/>
        <g class="snacking-arm"><path d="M144 106 Q164 124 136 142" fill="none" stroke="#424e57" stroke-width="12"/>
          <ellipse cx="135" cy="141" rx="6" ry="4" fill="url(#skin)"/><path d="M130 137 Q132 130 139 133 L137 139Z" fill="#e4c37e" stroke="#c5a05e" stroke-width=".7"/>
        </g>
      </g>
    </g>
  </svg><img class="custom" alt="Your personalized mini avatar" hidden>`;
  // Multiple preview instances share the page; keep gradient references local.
  const id = `buddy-${window.mountMascot.count = (window.mountMascot.count || 0) + 1}`;
  for (const name of ['skin', 'jacket']) {
    container.querySelector(`#${name}`).id = `${id}-${name}`;
    for (const node of container.querySelectorAll(`[fill="url(#${name})"]`)) node.setAttribute('fill', `url(#${id}-${name})`);
  }
};
window.applyMascot = (container, images, state) => {
  const pose = ['working', 'done', 'idle'].includes(state) ? state : 'waiting';
  container.dataset.state = state;
  const custom = container.querySelector('.custom');
  const image = images?.[pose] || (pose === 'idle' ? images?.waiting : undefined);
  custom.hidden = !image;
  container.querySelector('.original').classList.toggle('hidden', Boolean(image));
  if (image && custom.getAttribute('src') !== image) custom.src = image;
};
