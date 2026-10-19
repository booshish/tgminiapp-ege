type IllustrationProps = {
  className?: string;
};

/** Decorative, locally drawn artwork. No external images or fonts are needed. */
export function LearningIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 260 210"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        cx="139"
        cy="185"
        rx="100"
        ry="10"
        fill="#52775B"
        opacity=".07"
      />
      <circle cx="165" cy="79" r="56" fill="#E4ECDF" />
      <circle cx="165" cy="79" r="40" stroke="#CFDCC8" strokeWidth="1" />
      <path d="M165 23V135M109 79H221" stroke="#CFDCC8" strokeWidth="1" />
      <path d="M165 79L205 40" stroke="#ABBFA7" strokeWidth="1.5" />
      <circle cx="165" cy="79" r="3" fill="#52775B" />

      <g transform="rotate(-10 91 105)">
        <rect
          x="48"
          y="34"
          width="84"
          height="119"
          rx="6"
          fill="#52775B"
          opacity=".12"
        />
        <rect
          x="43"
          y="29"
          width="84"
          height="119"
          rx="6"
          fill="#FFFEF9"
          stroke="#CAD7C5"
          strokeWidth="1.4"
        />
        <path
          d="M55 48H114M55 65H114M55 82H114M55 99H114M55 116H114M55 133H100"
          stroke="#E3E8DC"
        />
        <path d="M61 29V148" stroke="#D6E0CF" />
        <text
          x="71"
          y="62"
          fill="#52775B"
          fontFamily="Georgia, serif"
          fontSize="15"
          fontStyle="italic"
        >
          a² + b²
        </text>
        <text
          x="81"
          y="80"
          fill="#52775B"
          fontFamily="Georgia, serif"
          fontSize="14"
          fontStyle="italic"
        >
          = c²
        </text>
        <path
          d="M74 119H105V93L74 119Z"
          fill="#EDF2E7"
          stroke="#799273"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M99 119V113H105" stroke="#799273" />
      </g>

      <path
        d="M119 153H216C220 153 222 156 222 160V170H119V153Z"
        fill="#7E9877"
      />
      <path d="M126 157H220V166H126C123 166 123 157 126 157Z" fill="#F9F8ED" />
      <path d="M132 160H215M132 163H215" stroke="#DCDDD0" strokeWidth=".7" />
      <path
        d="M105 169H218C221 169 223 172 223 176V184H105V169Z"
        fill="#496F51"
      />
      <path d="M112 173H221V180H112C109 180 109 173 112 173Z" fill="#F2F1E5" />
      <path d="M116 176H217" stroke="#DADDCF" strokeWidth=".7" />
      <path
        d="M120 182H225"
        stroke="#3E6145"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      <path
        d="M34 151C52 143 68 146 85 154C102 146 119 145 137 153L133 178C116 172 101 174 85 182C67 174 51 173 35 178L34 151Z"
        fill="#E4EBDD"
        stroke="#B8C8AF"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M35 147C52 140 69 143 85 151C101 143 119 142 136 149L133 174C116 169 101 171 85 178C68 170 50 169 36 174L35 147Z"
        fill="#FFFEF8"
        stroke="#CCD7C2"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M85 151V178" stroke="#C1CFB6" strokeWidth="1.2" />
      <path
        d="M44 151C54 148 65 150 76 154M44 157C54 154 65 156 76 160M44 163C54 160 65 162 76 166M94 154C105 149 117 148 127 151M94 160C105 155 117 154 127 157M94 166C105 161 117 160 126 163"
        stroke="#DDE4D4"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path d="M97 174V184L103 181L108 184V170" fill="#91A383" />

      <path
        d="M215 145C215 124 222 108 234 96"
        stroke="#758C6D"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M220 123C208 122 204 114 206 105C215 106 222 112 220 123Z"
        fill="#9BAF8F"
      />
      <path
        d="M225 112C224 101 229 94 239 93C240 101 236 109 225 112Z"
        fill="#7E9875"
      />
      <path
        d="M216 138C228 138 234 132 233 123C224 123 217 128 216 138Z"
        fill="#B2C2A5"
      />
      <circle cx="33" cy="109" r="3" fill="#B5C5AA" />
      <path
        d="M227 48V58M222 53H232"
        stroke="#93A887"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M143 17V25M139 21H147"
        stroke="#B1C1A6"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CoachIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="120" cy="153" rx="65" ry="8" fill="#52775B" opacity=".07" />
      <circle cx="123" cy="84" r="66" fill="#EEF2E8" />
      <path
        d="M71 122C76 106 91 98 119 98C147 98 164 107 169 123L174 144C158 152 83 152 66 144L71 122Z"
        fill="#B7C8AA"
      />
      <path
        d="M81 129C92 133 103 135 119 135C135 135 147 133 158 129"
        stroke="#9BAF8E"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect x="67" y="42" width="105" height="83" rx="36" fill="#52775B" />
      <path
        d="M83 50C94 44 109 43 120 43"
        stroke="#7C9677"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="82" y="61" width="76" height="47" rx="22" fill="#EFF3E7" />
      <ellipse cx="104" cy="82" rx="3.5" ry="5" fill="#466A4C" />
      <ellipse cx="137" cy="82" rx="3.5" ry="5" fill="#466A4C" />
      <path
        d="M115 94C118 97 123 97 126 94"
        stroke="#6F8B65"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M120 42V30"
        stroke="#52775B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="120" cy="27" r="5" fill="#9DB48F" />
      <path
        d="M67 74H62C58 74 56 77 56 81V88C56 92 58 95 62 95H67M172 74H177C181 74 183 77 183 81V88C183 92 181 95 177 95H172"
        fill="#8BA57F"
      />
      <path
        d="M81 115L74 133M158 115L165 133"
        stroke="#52775B"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M95 138H145"
        stroke="#DCE5D3"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="120" cy="120" r="3" fill="#E9F0E0" />
      <path
        d="M192 110C195 97 199 90 208 84"
        stroke="#8FA582"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M197 96C187 95 185 89 186 83C194 84 199 89 197 96Z"
        fill="#B6C8A8"
      />
      <path
        d="M201 91C200 82 204 77 211 76C213 83 209 89 201 91Z"
        fill="#91AA83"
      />
      <path
        d="M43 52L46 60L54 63L46 66L43 74L40 66L32 63L40 60L43 52Z"
        fill="#B4C5A6"
      />
      <path
        d="M190 38V49M184.5 43.5H195.5"
        stroke="#90A681"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="39" cy="112" r="4" stroke="#A7BB99" strokeWidth="1.5" />
      <circle cx="200" cy="130" r="2.5" fill="#CCD8C0" />
      <path d="M59 139L49 148H64L59 139Z" fill="#D2DECA" />
    </svg>
  );
}

export function TriangleDiagram() {
  return (
    <svg
      viewBox="0 0 320 220"
      role="img"
      aria-labelledby="triangle-diagram-title triangle-diagram-description"
      className="triangle-diagram"
      fill="none"
    >
      <title id="triangle-diagram-title">Прямоугольный треугольник ABC</title>
      <desc id="triangle-diagram-description">
        Угол B прямой. Катет AB равен 6, катет BC равен 8, гипотенуза AC равна
        10. Угол A находится внизу слева, напротив катета BC.
      </desc>
      <path d="M82 188H208V20L82 188Z" fill="#EDF2E7" fillOpacity=".6" />
      <path d="M82 188H117A35 35 0 0 0 103 160L82 188Z" fill="#D6E3CC" />
      <path
        d="M117 188A35 35 0 0 0 103 160"
        stroke="#91AA83"
        strokeWidth="1.4"
      />
      <path
        d="M82 188H208V20L82 188Z"
        stroke="#52775B"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M190 188V170H208" stroke="#52775B" strokeWidth="1.5" />
      <circle cx="82" cy="188" r="2.8" fill="#52775B" />
      <circle cx="208" cy="188" r="2.8" fill="#52775B" />
      <circle cx="208" cy="20" r="2.8" fill="#52775B" />
      <g
        fill="#344B36"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="17"
        fontStyle="italic"
      >
        <text x="60" y="207">
          A
        </text>
        <text x="219" y="207">
          B
        </text>
        <text x="220" y="24">
          C
        </text>
      </g>
      <g fill="#52775B" fontFamily="inherit" fontSize="17" fontWeight="500">
        <text x="145" y="212" textAnchor="middle">
          6
        </text>
        <text x="229" y="110">
          8
        </text>
        <text x="125" y="91" textAnchor="middle">
          10
        </text>
      </g>
      <text
        x="111"
        y="179"
        fill="#6B865F"
        fontFamily="Georgia, serif"
        fontSize="13"
        fontStyle="italic"
      >
        A
      </text>
    </svg>
  );
}
