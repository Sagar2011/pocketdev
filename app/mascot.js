// Original SVG artwork, animated with CSS. No external assets or animation runtime.
window.mountMascot = (container) => {
  container.innerHTML = `<svg class="original" viewBox="0 0 240 240" role="img" aria-label="PocketDev mini developer">
    <defs>
      <linearGradient id="jacket" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="#66706c"/><stop offset=".45" stop-color="#414c49"/><stop offset="1" stop-color="#293431"/></linearGradient>
      <linearGradient id="skin" x1="0" y1="0" x2="1" y2=".45"><stop stop-color="#dcbaa0"/><stop offset=".55" stop-color="#c39a7c"/><stop offset="1" stop-color="#a9795c"/></linearGradient>
      <linearGradient id="trousers" x2="1" y2=".3"><stop stop-color="#3c4650"/><stop offset="1" stop-color="#222b34"/></linearGradient>
    </defs>
    <ellipse cx="121" cy="219" rx="45" ry="3" fill="#15201e" opacity=".12"/>
    <g class="character" stroke-linecap="round" stroke-linejoin="round">
      <g class="standing-legs">
        <path d="M103 145 L139 145 L140 172 L145 209 L132 209 L121 164 L113 209 L99 209 L101 174Z" fill="url(#trousers)"/>
        <path d="M118 154 L110 198 M129 168 L138 199" fill="none" stroke="#626a6f" stroke-width=".9" opacity=".55"/>
        <path d="M100 204 L113 205 L114 213 Q105 216 93 215 L93 211Z M132 205 L145 205 L154 211 L154 215 L131 215Z" fill="#343b3e"/>
        <path d="M94 215 L114 215 M132 215 L154 215" stroke="#a6aaa5" stroke-width="1.5"/>
      </g>
      <g class="seated-legs">
        <path d="M99 158 L96 214 M142 158 L147 214" stroke="#66716b" stroke-width="3"/>
        <rect x="94" y="151" width="54" height="6" rx="1" fill="#9b998a"/>
        <path d="M104 145 Q89 147 85 165 L94 207 L107 205 L103 170 L120 163 L142 171 L142 206 L155 207 L163 165 Q153 150 137 145Z" fill="url(#trousers)"/>
        <path d="M94 168 L100 194 M153 172 L149 195" stroke="#667078" stroke-width=".9" fill="none" opacity=".5"/>
        <path d="M94 204 L106 204 L113 210 L112 216 L89 216 L89 212Z M143 204 L155 205 L164 211 L163 216 L141 216Z" fill="#343b3e"/>
        <path d="M90 216 L112 216 M142 216 L163 216" stroke="#a6aaa5" stroke-width="1.5"/>
      </g>
      <g class="torso">
        <path d="M116 72 L116 85 L129 85 L128 71Z" fill="url(#skin)"/>
        <path d="M116 76 Q122 81 128 75 L128 82 L116 83Z" fill="#946e55" opacity=".4"/>
        <path d="M115 82 L130 82 L139 95 L134 147 L108 147 L106 94Z" fill="#c4c3b8"/>
        <path d="M97 87 L114 81 L118 91 L116 146 L103 150 L98 115Z M129 81 L145 88 L145 116 L140 150 L126 146 L126 92Z" fill="url(#jacket)"/>
        <path d="M114 81 L109 87 L115 96 M129 81 L135 88 L128 96" stroke="#88918a" stroke-width="1" fill="none"/>
        <path d="M114 103 L113 143 M129 104 L130 143" stroke="#222e2b" stroke-width="1"/>
        <path d="M100 116 L110 116 L109 127 L101 126 M134 116 L143 115 L142 126 L135 127" stroke="#849088" stroke-width=".6" fill="none" opacity=".55"/>
        <path d="M119 95 L123 98 L122 135" stroke="#b2b2a8" stroke-width=".7" fill="none"/>
        <path d="M101 141 L111 139 M133 139 L141 141" stroke="#202c29" stroke-width="1.2"/>
      </g>
      <g class="head"><g class="face-detail">
        <path d="M108 58 Q105 56 106 62 Q107 66 110 65 M134 58 Q137 56 136 62 Q135 66 133 65" fill="#b8896b"/>
        <path d="M110 49 Q120 42 132 49 L134 62 L131 71 L124 77 L118 76 L111 70 L108 59Z" fill="url(#skin)"/>
        <path d="M109 61 L107 53 Q104 45 115 42 Q124 37 132 45 Q139 49 134 61 L132 54 L130 49 Q120 53 112 49 L111 60Z" fill="#303433"/>
        <path d="M112 46 Q120 42 129 46" stroke="#5c605b" stroke-width=".9" fill="none"/>
        <path d="M113 57 L118 56 M126 56 L131 57" stroke="#534637" stroke-width="1"/>
        <g class="eyes" fill="#343936"><path d="M113 60 Q116 58 119 60 M125 60 Q128 58 131 60" fill="none" stroke="#584d40" stroke-width=".75"/><ellipse cx="116" cy="60" rx=".85" ry="1"/><ellipse cx="128" cy="60" rx=".85" ry="1"/></g>
        <path d="M122 59 L120 66 L123 67" stroke="#997055" stroke-width=".7" fill="none"/>
        <path d="M112 66 L114 70 Q122 78 130 70 L132 65 L130 72 L124 77 L118 76 L112 71Z" fill="#534d43" opacity=".24"/>
        <path class="mouth" d="M118 71 Q122 72 126 71" stroke="#785746" stroke-width=".85" fill="none"/>
        <path d="M119 74 L124 74" stroke="#e0b597" stroke-width=".65" opacity=".65"/>
      </g></g>
      <g class="pose pose-waiting">
        <path d="M99 92 Q84 115 94 135 L105 144" stroke="#47534d" stroke-width="11" fill="none"/>
        <path d="M90 118 L94 132" stroke="#748076" stroke-width="1" fill="none"/>
        <g class="notepad">
          <path d="M101 126 L130 122 L136 166 L106 170Z" fill="#cfccbd" stroke="#777f73" stroke-width=".8"/>
          <path d="M103 128 L128 125 L133 164 L108 167Z" fill="#f1eee4"/>
          <path d="M105 124 L106 130 M112 123 L113 129 M119 122 L120 128 M126 121 L127 127" stroke="#5e6961" stroke-width="1.4"/>
          <path d="M110 138 L126 136 M111 145 L127 143 M112 152 L124 150" stroke="#bac0b4" stroke-width=".8"/>
          <path d="M99 139 Q104 137 108 142 L110 146 L105 149 L101 146Z" fill="url(#skin)"/>
          <path d="M129 132 L133 155" stroke="#535e57" stroke-width="1.5"/>
        </g>
        <g class="knocking-arm">
          <path d="M142 92 L155 119 L171 99" fill="none" stroke="#414d47" stroke-width="11"/>
          <path d="M153 110 L158 114" stroke="#79847a" stroke-width="1"/>
          <path d="M167 100 L167 91 Q168 87 172 87 L178 88 Q181 90 179 94 L178 100 L173 104Z" fill="url(#skin)"/>
          <path d="M171 89 L171 94 M175 90 L175 94" stroke="#9e7155" stroke-width=".7"/>
        </g>
        <g class="knock-marks" stroke="#9a8968" stroke-width="1.2"><path d="M186 84 L191 81 M188 94 L194 94 M184 104 L190 107"/></g>
      </g>
      <g class="pose pose-working">
        <path d="M99 92 L104 127 L133 146" fill="none" stroke="#47534d" stroke-width="11"/>
        <path d="M99 119 L104 129 L121 139" fill="none" stroke="#7b857b" stroke-width=".8"/>
        <g class="typing-right"><path d="M142 92 L153 120 L155 146" fill="none" stroke="#414d47" stroke-width="11"/><path d="M151 142 L157 142 L161 149 L153 150Z" fill="url(#skin)"/></g>
        <path d="M65 160 L181 160 M73 162 L69 217 M174 162 L178 217" stroke="#4b5653" stroke-width="2.5"/>
        <path d="M64 157 L182 157" stroke="#aaa99b" stroke-width="5"/>
        <path d="M67 116 L117 116 L128 150 L78 150Z" fill="#79878c" stroke="#4b5b61" stroke-width="1"/>
        <path d="M70 119 L115 119 L124 147 L81 147Z" fill="#95a1a3"/>
        <path d="M79 150 L169 150 L164 154 L81 154Z" fill="#c0c8c7" stroke="#64726f" stroke-width=".8"/>
        <path d="M133 151 L157 151" stroke="#687873" stroke-width="1"/>
        <path d="M94 132 L98 130 L100 133 L96 135Z" fill="#cbd2cf"/>
        <g class="typing-left"><path d="M129 143 Q135 142 139 145 L143 149 L132 149Z" fill="url(#skin)"/></g>
        <g class="typing-fingers"><path d="M152 144 Q158 142 161 145 L165 149 L154 149Z" fill="url(#skin)"/></g>
        <g class="scratch-arm"><path d="M142 92 Q159 90 150 69 L137 54" stroke="#414d47" stroke-width="10" fill="none"/>
          <path class="scratch-hand" d="M135 60 L131 55 Q129 52 132 49 L135 47 L139 51 L140 56Z" fill="url(#skin)"/>
        </g>
      </g>
      <g class="pose pose-done">
        <path d="M99 92 L88 123 L91 153" fill="none" stroke="#47534d" stroke-width="11"/>
        <path d="M87 150 L94 150 L95 160 L92 165 L88 161Z" fill="url(#skin)"/>
        <g class="thumb-arm"><path d="M142 92 L156 119 L173 102" fill="none" stroke="#414d47" stroke-width="11"/>
          <path d="M169 104 L168 97 L172 92 L175 82 Q176 79 178 81 L179 84 L177 93 L184 95 Q187 96 185 100 L183 106 L176 108Z" fill="url(#skin)"/>
          <path d="M178 97 L184 99 M177 101 L183 103" stroke="#9e7155" stroke-width=".6"/>
        </g>
      </g>
      <g class="pose pose-idle">
        <path d="M99 92 Q83 117 98 139 L108 145" fill="none" stroke="#47534d" stroke-width="11"/>
        <g class="chipbag">
          <path d="M109 131 L133 129 L137 164 Q125 168 111 166Z" fill="#b9a17b" stroke="#8e7c60" stroke-width=".8"/>
          <path d="M109 132 L112 129 L116 131 L120 128 L124 130 L128 127 L132 130" stroke="#ded1b4" stroke-width="1.3" fill="none"/>
          <path d="M116 140 L130 138 L132 149 L118 151Z" fill="#e1d6bb"/>
          <path d="M119 142 L127 141 M120 146 L126 145" stroke="#988568" stroke-width=".8"/>
          <path d="M115 163 L132 161" stroke="#8e7c60" stroke-width=".8"/>
        </g>
        <path d="M105 140 Q111 139 115 143 L116 146 L109 149 L105 146Z" fill="url(#skin)"/>
        <g class="snacking-arm"><path d="M142 92 Q161 117 134 137" fill="none" stroke="#414d47" stroke-width="10"/>
          <path d="M129 135 L135 134 L139 138 L135 142 L129 140Z" fill="url(#skin)"/>
          <path d="M131 134 Q131 129 136 130 L136 135Z" fill="#d9bf87" stroke="#b69a63" stroke-width=".6"/>
        </g>
      </g>
    </g>
  </svg><img class="custom" alt="Your personalized mini avatar" hidden>`;
  // Multiple preview instances share the page; keep gradient references local.
  const id = `buddy-${(window.mountMascot.count = (window.mountMascot.count || 0) + 1)}`;
  for (const name of ["skin", "jacket", "trousers"]) {
    container.querySelector(`#${name}`).id = `${id}-${name}`;
    for (const node of container.querySelectorAll(`[fill="url(#${name})"]`))
      node.setAttribute("fill", `url(#${id}-${name})`);
  }
};
window.applyMascot = (container, images, state) => {
  const pose = ["working", "done", "idle"].includes(state) ? state : "waiting";
  container.dataset.state = state;
  const custom = container.querySelector(".custom");
  const image =
    images?.[pose] || (pose === "idle" ? images?.waiting : undefined);
  custom.hidden = !image;
  container
    .querySelector(".original")
    .classList.toggle("hidden", Boolean(image));
  if (image && custom.getAttribute("src") !== image) custom.src = image;
};
