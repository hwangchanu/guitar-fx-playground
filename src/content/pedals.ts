// 페달별 교육 콘텐츠 (설명 패널의 핵심). 순수 데이터.
export interface PedalContent {
  description: string
  whyOrder: string
}

export const PEDAL_CONTENT: Record<string, PedalContent> = {
  overdrive: {
    description:
      '신호를 의도적으로 찌그러뜨려 따뜻한 배음과 거친 질감을 더합니다. 록·블루스 톤의 핵심.',
    whyOrder:
      '보통 체인 앞쪽. 깨끗한 신호에 먼저 걸어야 디스토션 특유의 질감이 살고, 뒤에 두면 다른 이펙트의 잔향까지 같이 일그러져 지저분해집니다.',
  },
  delay: {
    description:
      '입력음을 일정 시간 뒤에 반복해 메아리(에코)를 만듭니다. 공간감과 리듬감을 줍니다.',
    whyOrder:
      '대개 체인 뒤쪽(드라이브 다음). 일그러진 소리에 에코를 거는 게 자연스럽고, 반대로 하면 에코 하나하나가 디스토션에 다시 씹혀 탁해집니다.',
  },
  reverb: {
    description:
      '수많은 짧은 반사를 더해 공간(방·홀) 안에 있는 듯한 잔향을 만듭니다.',
    whyOrder:
      '보통 체인 맨 끝. 마지막에 공간을 입혀야 자연스럽습니다. 리버브를 앞에 두고 드라이브를 걸면 잔향까지 일그러져 뭉개집니다.',
  },
}
