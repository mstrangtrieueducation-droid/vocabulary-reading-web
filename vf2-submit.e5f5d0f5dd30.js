(function () {
  "use strict";

  var API_BASE = String(document.documentElement.dataset.apiEndpoint || "").trim();
  var BRIDGE_SOURCE = "vf2-drive-submit";
  var MAX_PDF_BYTES = 100 * 1024 * 1024;
  var MAX_VIDEO_BYTES = 1024 * 1024 * 1024;
  var MAX_IMAGES = 40;
  var MAX_IMAGE_BYTES = 30 * 1024 * 1024;
  var CHUNK_BYTES = 8 * 1024 * 1024;
  var FINGERPRINT_WINDOW_BYTES = 64 * 1024;
  var IMAGE_PATTERN = /\.(?:jpe?g|png|webp|heic|heif)$/i;
  var PDF_PATTERN = /\.pdf$/i;
  var VIDEO_PATTERN = /\.(?:mp4|mov|m4v|webm|avi|mkv|3gp)$/i;

  var PROGRAMS = Object.freeze({
    VF1: Object.freeze({ name: "Vocabulary Foundation 1", units: 14 }),
    VF2: Object.freeze({ name: "Vocabulary Foundation 2", units: 14 }),
    RI1: Object.freeze({ name: "Reading Intensive 1", units: 12 }),
    RI2: Object.freeze({ name: "Reading Intensive 2", units: 12 }),
  });

  var IELTS_WRITING_ASSIGNMENTS = Object.freeze({
    "IELTS-WRITING-W07": Object.freeze({
      lesson: 7,
      tasks: Object.freeze([
        Object.freeze({ type: "image", image: "../w07-prompts/car-production.png", alt: "Đề 1: Car production", minWords: 150 }),
        Object.freeze({ type: "image", image: "../w07-prompts/prison-population.png", alt: "Đề 2: Prison population", minWords: 150 }),
      ]),
    }),
    "IELTS-WRITING-W17": Object.freeze({
      lesson: 17,
      tasks: Object.freeze([
        Object.freeze({ type: "image", image: "../w17-prompts/w17-prompt-1.png", alt: "Đề 1: US travel reasons and issues", minWords: 150 }),
        Object.freeze({ type: "image", image: "../w17-prompts/w17-prompt-2.png", alt: "Đề 2: Australian temperatures and rainfall", minWords: 150 }),
      ]),
    }),
    "IELTS-WRITING-W23": Object.freeze({
      lesson: 23,
      tasks: Object.freeze([
        Object.freeze({ type: "text", title: "IELTS Writing Task 2", prompt: "Advertisements are becoming more and more common in our everyday life.\n\nIs it a positive or negative development?", minWords: 250 }),
      ]),
    }),
    "IELTS-WRITING-W26": Object.freeze({
      lesson: 26,
      tasks: Object.freeze([
        Object.freeze({ type: "text", title: "IELTS Writing Task 2 · Đề 1", prompt: "Some people regard video games as harmless fun, or even as a useful educational tool. Others, however, believe that video games are having an adverse effect on the people who play them.\n\nIn your opinion, do the drawbacks of video games outweigh the benefits?", minWords: 250 }),
        Object.freeze({ type: "text", title: "IELTS Writing Task 2 · Đề 2", prompt: "It is now possible for scientists and tourists to travel to remote areas with natural environments, such as the South Pole.\n\nIs this a positive or negative development?", minWords: 250 }),
      ]),
    }),
    "IELTS-WRITING-W33": Object.freeze({
      lesson: 33,
      tasks: Object.freeze([
        Object.freeze({ type: "text", title: "Topic 10.1.6", prompt: "In today’s world of advanced science and technology, people still greatly value artists such as musicians, writers, and painters.\n\nWhat can the arts tell us about life that science and technology cannot?", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 10.2.1", prompt: "Some people think history has nothing or little to tell us, but others think that studying the past can help us better understand the present.\n\nDiscuss both views and give your opinion.", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 10.4", prompt: "Most people have forgotten the meaning behind traditional or religious festivals; during festival periods, people nowadays only want to enjoy themselves.\n\nTo what extent do you agree or disagree with this opinion?", minWords: 250 }),
      ]),
    }),
    "IELTS-WRITING-W35": Object.freeze({
      lesson: 35,
      tasks: Object.freeze([
        Object.freeze({ type: "text", title: "Đề 1", prompt: "When children start school, teachers have more influence on their intellectual and social development than their parents.\n\nTo what extent do you agree or disagree?", minWords: 250 }),
        Object.freeze({ type: "text", title: "Đề 2", prompt: "New parents should attend parenting courses to ensure the growth of their children.\n\nTo what extent do you agree or disagree?", minWords: 250 }),
        Object.freeze({ type: "text", title: "Đề 3", prompt: "Some people prefer to live alone. Others enjoy sharing a house with family or friends.\n\nDo the advantages of living with others outweigh the disadvantages?", minWords: 250 }),
      ]),
    }),
    "IELTS-WRITING-W36": Object.freeze({
      lesson: 36,
      tasks: Object.freeze([
        Object.freeze({ type: "text", title: "Topic 14", prompt: "Some people say that cheap air travel gives ordinary people more freedom to travel further. Other people say that it adds to the world’s environmental problems and therefore should be made more expensive to discourage people from traveling too much.\n\nDiscuss both views and give your opinion.", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 15", prompt: "Scientists believe that computers will become more intelligent than human beings. Some people find it is a positive trend while others think it is a negative development.\n\nDiscuss both points and give your own opinion.", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 16", prompt: "More and more people want to own famous brands of clothes, cars and other items.\n\nWhat are the reasons? Is this a positive or negative development?", minWords: 250 }),
      ]),
    }),
    "IELTS-WRITING-W37": Object.freeze({
      lesson: 37,
      tasks: Object.freeze([
        Object.freeze({ type: "text", title: "Topic 17 · Đề 1", prompt: "The best way to solve the world’s environmental problems is to increase the cost of fuel.\n\nTo what extent do you agree or disagree?", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 17 · Đề 2", prompt: "It is a natural process for animal species to become extinct. There is no reason why people should try to prevent this from happening.\n\nTo what extent do you agree or disagree with the statement?", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 17 · Đề 3", prompt: "In the modern world, it is no longer necessary to use animals as food, or to use animal products for, for example, clothing and medicines.\n\nTo what extent do you agree or disagree?", minWords: 250 }),
      ]),
    }),
    "IELTS-WRITING-W38": Object.freeze({
      lesson: 38,
      tasks: Object.freeze([
        Object.freeze({ type: "text", title: "Topic 18.1.3", prompt: "Some people say public health would be greatly improved if governments made laws concerning people's nutrition and food choices. Others argue that this is a matter of personal choice and personal responsibility.\n\nDiscuss both these views and give your own opinion.", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 18.5.5", prompt: "Some people think that it is best to live in a horizontal city while others think of a vertical city.\n\nDiscuss both views and give your opinion.", minWords: 250 }),
        Object.freeze({ type: "text", title: "Topic 19.1.1", prompt: "Scientists believe that by studying behaviour of 3-year-old children, we can predict if that child can become criminals in the future.\n\nTo what extent is crime a product of human nature?\n\nIs it possible to stop children from growing to be a criminal?", minWords: 250 }),
      ]),
    }),
    "IELTS-WRITING-W39": Object.freeze({
      lesson: 39,
      tasks: Object.freeze([]),
    }),
  });

  IELTS_WRITING_ASSIGNMENTS = Object.freeze({
  "IELTS-WRITING-W07": Object.freeze({
    lesson: 7,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W07-item-05.png", alt: "ĐỀ 1 | CAR PRODUCTION", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W07-item-08.png", alt: "ĐỀ 2 | PRISON POPULATION", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W08": Object.freeze({
    lesson: 8,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W08-item-05.png", alt: "ĐỀ 1 | MEAT AND FISH CONSUMPTION", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W08-item-08.png", alt: "ĐỀ 2 | HIGHER EDUCATION", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W09": Object.freeze({
    lesson: 9,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W09-item-05.png", alt: "ĐỀ 1 | FEMALE MEMBERS OF PARLIAMENT", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W09-item-08.png", alt: "ĐỀ 2 | REASONS FOR CHOOSING A UNIVERSITY", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W10": Object.freeze({
    lesson: 10,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W10-item-05.png", alt: "ĐỀ 1 | POPULATION AGED 65 AND ABOVE", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W13": Object.freeze({
    lesson: 13,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W13-item-05.png", alt: "ĐỀ 1 | MOST COMMON SPORTS IN THE UK", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W13-item-08.png", alt: "ĐỀ 2 | DOCTOR AND OTHER WORKERS SALARIES", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W14": Object.freeze({
    lesson: 14,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W14-item-05.png", alt: "ĐỀ 1 | FIRST-YEAR STUDENTS' EVALUATION", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W14-item-08.png", alt: "ĐỀ 2 | TOP 200 UNIVERSITIES", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W15": Object.freeze({
    lesson: 15,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W15-item-05.png", alt: "ĐỀ 1 | SALARIES AND UNIVERSITY FEES", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W15-item-08.png", alt: "ĐỀ 2 | UK MIGRATION REASONS", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W16": Object.freeze({
    lesson: 16,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W16-item-05.png", alt: "ĐỀ 1 | CHILDREN'S BEDTIME ROUTINES", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W16-item-08.png", alt: "ĐỀ 2 | WORLD FOREST AND TIMBER", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W17": Object.freeze({
    lesson: 17,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W17-item-05.png", alt: "US TRAVEL REASONS AND ISSUES", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W17-item-08.png", alt: "AUSTRALIAN TEMPERATURES AND RAINFALL", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W18": Object.freeze({
    lesson: 18,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W18-item-05.png", alt: "TRAIN PASSENGERS AND PUNCTUALITY", minWords: 150 }),
      Object.freeze({ type: "image", image: "../writing-prompts/W18-item-08.png", alt: "ENDANGERED PLANT SPECIES", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W19": Object.freeze({
    lesson: 19,
    tasks: Object.freeze([
      Object.freeze({ type: "image", image: "../writing-prompts/W19-item-05.png", alt: "ĐỀ 1 | CHANGES IN SHALTON VILLAGE", minWords: 150 }),
    ]),
  }),
  "IELTS-WRITING-W27": Object.freeze({
    lesson: 27,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 1.1", prompt: "If a product is good or meets people\u0019s needs, they will buy it. Therefore, advertising is unnecessary and no more than entertainment. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 1.3", prompt: "Today, the high sales of popular consumer goods reflect the power of advertising and not the real needs of the society in which they are sold. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 1.6", prompt: "Research indicates that nowadays some consumers are much less influenced by advertising than in the past.\nWhat are the reasons for this trend? \nDo you think this is a positive or negative development?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W28": Object.freeze({
    lesson: 28,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 2.2", prompt: "Online shopping is increasing dramatically. \nHow could this trend affect our environment and the kinds of jobs required?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 3.3", prompt: "Some say that news has no connection with most people's lives, and it is a waste of time for most of us to read newspapers and watch television news programs.\nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 3.4.1", prompt: "Some people say we do not need printed newspaper anymore. \nTo what extent do you agree or disagree with this opinion?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W29": Object.freeze({
    lesson: 29,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 4.2", prompt: "With the rapid development of communication technology; e.g. smart phones, tablets and other mobile devices, some people believe that the disadvantages outweigh the advantages. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 4.5", prompt: "Some people think that the increasing use of computers and mobile phones for communication has a negative effect on young people\u0019s reading and writing skills. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 4.6", prompt: "The Internet has transformed the way information is shared and consumed, but it has also created problems that did not exist before.\nWhat are the most serious problems associated with the Internet and what are the possible solutions?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W30": Object.freeze({
    lesson: 30,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 7.2", prompt: "Some people believe that reading stories from a book is better than watching TV or playing computer games for children. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 8.1", prompt: "Some people think that studying at university or college is the best way for students to prepare for their future career. Others, however, say today this is no longer true. \nDiscuss both views and give your opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 8.5", prompt: "Too much emphasis is placed on going to university for academic education. People should be encouraged to do vocational training, because there is a lack of qualified tradespeople such as electricians or plumbers. \nTo what extent do you agree or disagree?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W31": Object.freeze({
    lesson: 31,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 9.2.1", prompt: "The government should invest more money in teaching science than other subjects for a country\u0019s development and progress.  \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 9.6", prompt: "Many people argue that in order to improve educational quality, high school students should be encouraged to make comments or even criticism on their teachers. Others; however, think it will lead to loss of respect and discipline in the classroom.\nDiscuss both views and give your opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 9.9.1", prompt: "Schools are no longer necessary because children can get so much information available through the Internet, and they can study just as well at home.\nTo what extent do you agree or disagree?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W33": Object.freeze({
    lesson: 33,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 10.1.6", prompt: "In today\u0019s world of advanced science and technology, people still greatly value artists such as musicians, writers, and painters.\nWhat can the arts tell us about life that science and technology cannot?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 10.2.1", prompt: "Some people think history has nothing or little to tell us, but others think that studying the past can help us better understand the present.\nDiscuss both views and give your opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 10.4", prompt: "Most people have forgotten the meaning behind traditional or religious festivals; during festival periods, people nowadays only want to enjoy themselves.\nTo what extent do you agree or disagree with this opinion?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W34": Object.freeze({
    lesson: 34,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 11.2.1", prompt: "Large companies use sports events to promote their products. Some people think it has a negative impact on sports. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 11.4", prompt: "Some people say that to be successful in sport it is more important to be physically strong. Others argue that mental strength is more important.\nDiscuss both views and give your opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 12.7", prompt: "Nowadays in many countries women have full time jobs. Therefore, it is logical to share household tasks evenly between men and women.\nTo what extent do you agree or disagree with this statement?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W35": Object.freeze({
    lesson: 35,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 13.1.2", prompt: "When children start school, teachers have more influence on their intellectual and social development than their parents. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 13.3.1", prompt: "New parents should attend parenting courses to ensure the growth of their children. \nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 13.5", prompt: "Some people prefer to live alone. Others enjoy sharing a house with family or friends. \nDo the advantages of living with others outweigh the disadvantages?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W36": Object.freeze({
    lesson: 36,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 14.1.4", prompt: "Some people say that cheap air travel gives ordinary people more freedom to travel further. Other people say that it adds to the world\u0019s environmental problems and therefore should be made more expensive to discourage people from traveling too much. \nDiscuss both views and give your opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 15.2", prompt: "Scientists believe that computers will become more intelligent than human beings. Some people find it is a positive trend while others think it is a negative development.\nDiscuss both points and give your own opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 16.2.1", prompt: "More and more people want to own famous brands of clothes, cars and other items. \nWhat are the reasons? \nIs this a positive or negative development?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W37": Object.freeze({
    lesson: 37,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 17.1.1", prompt: "The best way to solve the world\u0019s environmental problems is to increase the cost of fuel.\nTo what extent do you agree or disagree?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 17.2.1", prompt: "It is a natural process for animal species to become extinct. There is no reason why people should try to prevent this from happening.\nTo what extent do you agree or disagree with the statement?", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 17.2.4", prompt: "In the modern world, it is no longer necessary to use animals as food, or to use animal products for, for example, clothing and medicines.\nTo what extent do you agree or disagree?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W38": Object.freeze({
    lesson: 38,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "TOPIC 18.1.3", prompt: "Some people say public health would be greatly improved if governments made laws concerning people's nutrition and food choices. Others argue that this is a matter of personal choice and personal responsibility. \nDiscuss both these views and give your own opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 18.5.5", prompt: "Some people think that it is best to live in a horizontal city while others think of a vertical city.\nDiscuss both views and give your opinion.", minWords: 250 }),
      Object.freeze({ type: "text", title: "TOPIC 19.1.1", prompt: "Scientists believe that by studying behaviour of 3-year-old children, we can predict if that child can become criminals in the future.\nTo what extent is crime a product of human nature?\nIs it possible to stop children from growing to be a criminal?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W23": Object.freeze({
    lesson: 23,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "IELTS Writing Task 2", prompt: "Advertisements are becoming more and more common in our everyday life.\n\nIs it a positive or negative development?", minWords: 250 }),
    ]),
  }),
  "IELTS-WRITING-W26": Object.freeze({
    lesson: 26,
    tasks: Object.freeze([
      Object.freeze({ type: "text", title: "IELTS Writing Task 2 · Đề 1", prompt: "Some people regard video games as harmless fun, or even as a useful educational tool. Others, however, believe that video games are having an adverse effect on the people who play them.\n\nIn your opinion, do the drawbacks of video games outweigh the benefits?", minWords: 250 }),
      Object.freeze({ type: "text", title: "IELTS Writing Task 2 · Đề 2", prompt: "It is now possible for scientists and tourists to travel to remote areas with natural environments, such as the South Pole.\n\nIs this a positive or negative development?", minWords: 250 }),
    ]),
  }),
  });

  var IELTS_WRITING_FORMS = Object.freeze({
    "IELTS-WRITING-W05": "https://docs.google.com/forms/d/1bSdyx9e7xsZZT1ncAF_p0wWphjNHCVF8GQIf5RtAmU4/viewform",
    "IELTS-WRITING-W06": "https://docs.google.com/forms/d/1hmy61yVRyW_jktSMGOg7b-aJHgM2Tmy381HHl3tGyI4/viewform",
    "IELTS-WRITING-W07": "https://docs.google.com/forms/d/13n8bkH4sZm_928TvCYqawowR7eC6H_LJ4YfxmB1HfvI/viewform",
    "IELTS-WRITING-W08": "https://docs.google.com/forms/d/17MQkay4baPs_R4GVBshnvWs1q5psohEDNxuRv7UrSgQ/viewform",
    "IELTS-WRITING-W09": "https://docs.google.com/forms/d/1Rugd99LL3bY0JnstHKaPnDwFRCurw_ShbU19Jgd_vco/viewform",
    "IELTS-WRITING-W10": "https://docs.google.com/forms/d/1O8qnGLD1aQywmrXmYT6dJ2YbT1mBNxjrxpoawnB1yRM/viewform",
    "IELTS-WRITING-W12": "https://docs.google.com/forms/d/1LEVE5Q_02P6858Ssd0t1qqLkvGKCBKVZWlcLT9m0cc4/viewform",
    "IELTS-WRITING-W13": "https://docs.google.com/forms/d/1tT-2SXwjA_RqRKG8-5GCe-kYnOqFRztQvcjW-xQdess/viewform",
    "IELTS-WRITING-W14": "https://docs.google.com/forms/d/1rF_6HETx-sOhg2y_nxiDZqsb9AdBNFNh_zEPRixOqog/viewform",
    "IELTS-WRITING-W15": "https://docs.google.com/forms/d/1I1i9W23lrO_21EEusrZQ_g0uRtRJllJNU0OHJnQdYYc/viewform",
    "IELTS-WRITING-W16": "https://docs.google.com/forms/d/1N5DkVY5UyajmESP1rSoGhwLfJSlzZjmr-tFdqW-Sguc/viewform",
    "IELTS-WRITING-W17": "https://docs.google.com/forms/d/1OuIkpmGMRLdx2SgRgrkJjRXb-ScOLIQhARCwo3pS1Uw/viewform",
    "IELTS-WRITING-W18": "https://docs.google.com/forms/d/1DN19y5Ylcixqd2Y3AmjInZYbVaM_nH4YabzIC3cf7fU/viewform",
    "IELTS-WRITING-W19": "https://docs.google.com/forms/d/1aUSO3XsbRnvxz1w7T0gFK34VPeanAXdE1gFItDDW7Dc/viewform",
    "IELTS-WRITING-W21": "https://docs.google.com/forms/d/1S9dhCr7zJvjq0yCt4vgRL-KHJFxrXdxwtpQfyGWwvmc/viewform",
    "IELTS-WRITING-W22": "https://docs.google.com/forms/d/1gtJNqsxwyXUg0-g6R87d-FXWTnCwNnC3CoL8sEKEcfM/viewform",
    "IELTS-WRITING-W23": "https://docs.google.com/forms/d/1oWzxuUEetXPQo51OTNsbgDA6JpbSxm9yrdu_1CSSYpY/viewform",
    "IELTS-WRITING-W24": "https://docs.google.com/forms/d/1fkTopNzXgtqrzQZrjeOYpHEiN_mzMtbQvCyb3-33ucs/viewform",
    "IELTS-WRITING-W25": "https://docs.google.com/forms/d/1iKdkRPn8wTjZYfdQK_X5lHDmy0JCg5yRYjtJnWGQ13g/viewform",
    "IELTS-WRITING-W26": "https://docs.google.com/forms/d/15deiH60qfaC2SMQ-ZKfmOuI29RERQpkDQH6Kqj1XcuE/viewform",
    "IELTS-WRITING-W27": "https://docs.google.com/forms/d/1jRYO1mbdH_xGxr6bEKG0YHJUCbKNVB0yBSHxM_Ad5bI/viewform",
    "IELTS-WRITING-W28": "https://docs.google.com/forms/d/1ynoBn6OUTctQl0frg93d_aKmxESsdvjd0udTP2WEmyE/viewform",
    "IELTS-WRITING-W29": "https://docs.google.com/forms/d/1Q9tiom4XI6WBf1hhBWQASso-7-lqls3xfyRgVcsx14s/viewform",
    "IELTS-WRITING-W30": "https://docs.google.com/forms/d/1S3Ft-5fmhn4iBOwFRpzcjiNA58tdjLfV4IzLj-MD0ss/viewform",
    "IELTS-WRITING-W31": "https://docs.google.com/forms/d/1yd-veW_aF_BJUKMdwDFSYe51i2KXavgrZKgVs8b0bQI/viewform",
    "IELTS-WRITING-W33": "https://docs.google.com/forms/d/1cFIm1bN32yP-ezCW3VeoZBp_flLdfimgTkTW8RipqkA/viewform",
    "IELTS-WRITING-W34": "https://docs.google.com/forms/d/1wi-sh3-Jhk_Z-iNB-uvgx8fA1QadAhNdZZ046cc8kOc/viewform",
    "IELTS-WRITING-W35": "https://docs.google.com/forms/d/1T-vJoayYyiNW6dZTZAhe6Tgmkb-Ie7HJBK5wN4_z5bo/viewform",
    "IELTS-WRITING-W36": "https://docs.google.com/forms/d/1DvsUcw_-OXSGDoiA3ceMLJgUrsEtijzVFEm9wbP0X4g/viewform",
    "IELTS-WRITING-W37": "https://docs.google.com/forms/d/1PFyJ8BXFleu_e5ZxOTF4fOGip1JolLAfMh1To6kJS4c/viewform",
    "IELTS-WRITING-W38": "https://docs.google.com/forms/d/13llSTIKpp1_3--mdL8C21TrOA2uxyWSHojh_TN-O-Sc/viewform",
    "IELTS-WRITING-W39": "https://docs.google.com/forms/d/1PVBv-TtChKg85rN-HErIescx2BcyoU0PdMgKXtsMk7Y/viewform",
  });

  var params = new URLSearchParams(window.location.search);
  var requestedCode = String(params.get("code") || "").trim().toUpperCase();
  var codeMatch = /^(VF1|VF2|RI1|RI2)-U(0[1-9]|1[0-4])$/.exec(requestedCode);
  var correctionMatch = /^(RI1|RI2)-C(0[1-9]|1[0-2])$/.exec(requestedCode);
  var academicMatch = /^AP-B(0[1-8])$/.exec(requestedCode);
  var grammarMatch = /^GF1-U(0[1-9]|1[0-9]|20|04\.[12]|05\.[12]|09\.[12])-LT$/.exec(requestedCode);
  var ieltsReadingMatch = /^IELTS-READING-B01$/.exec(requestedCode);
  var ieltsWritingMatch = /^IELTS-WRITING-W(05|06|07|08|09|10|12|13|14|15|16|17|18|19|21|22|23|24|25|26|27|28|29|30|31|33|34|35|36|37|38|39)$/.exec(requestedCode);
  var writingFormUrl = IELTS_WRITING_FORMS[requestedCode] || "";
  if (writingFormUrl) {
    window.location.replace(writingFormUrl);
    return;
  }
  var writingAssignment = IELTS_WRITING_ASSIGNMENTS[requestedCode] || null;
  var isWritingRoom = Boolean(writingAssignment && writingAssignment.tasks && writingAssignment.tasks.length);
  var activeWritingTask = 1;
  var notebookOnly = Boolean(correctionMatch || academicMatch || grammarMatch || ieltsWritingMatch);
  var submissionKind = correctionMatch ? "correction" : (academicMatch ? "academic" : (grammarMatch ? "grammar" : (ieltsReadingMatch ? "ieltsReading" : (ieltsWritingMatch ? "ieltsWriting" : "vocabulary"))));
  var program = correctionMatch
    ? Object.freeze({ name: correctionMatch[1] === "RI1" ? "Reading Intensive 1 · Vở chữa" : "Reading Intensive 2 · Vở chữa", units: 12 })
    : (academicMatch
      ? Object.freeze({ name: "Đoạn văn học thuật", units: 8 })
      : (grammarMatch
        ? Object.freeze({ name: "Grammar Foundation", units: 23 })
        : (ieltsWritingMatch
          ? Object.freeze({
              name: "IELTS Writing",
              units: 1,
              classes: Object.freeze([
                "IELTS 40", "IELTS 41", "IELTS 42", "IELTS 43", "IELTS 44", "IELTS 45", "IELTS 46",
                "IELTS 47", "IELTS 48", "IELTS 49", "IELTS 50", "IELTS 51", "IELTS 52", "IELTS 53",
              ]),
            })
          : (ieltsReadingMatch
          ? Object.freeze({
              name: "IELTS Reading",
              units: 1,
              classes: Object.freeze([
                "IELTS 40", "IELTS 41", "IELTS 42", "IELTS 43", "IELTS 44", "IELTS 45", "IELTS 46",
                "IELTS 47", "IELTS 48", "IELTS 49", "IELTS 50", "IELTS 51", "IELTS 52", "IELTS 53",
              ]),
            })
          : (codeMatch ? PROGRAMS[codeMatch[1]] : null)))));
  var matchedUnit = correctionMatch
    ? Number(correctionMatch[2])
    : (academicMatch ? Number(academicMatch[1]) : (grammarMatch ? grammarMatch[1] : (ieltsWritingMatch ? Number(ieltsWritingMatch[1]) : (ieltsReadingMatch ? 1 : (codeMatch ? Number(codeMatch[2]) : 0)))));
  var validVocabulary = Boolean(codeMatch && program && Number(matchedUnit) <= program.units);
  var assignmentCode = (notebookOnly || validVocabulary || ieltsReadingMatch) ? requestedCode : "";
  var unitNumber = assignmentCode ? matchedUnit : 0;
  var notebookCopy = submissionKind === "correction"
    ? Object.freeze({ short: "vở chữa bài", eyebrow: "NỘP VỞ CHỮA BÀI", title: "Bài chữa " + unitNumber + " · Nộp vở", file: "vo-chua" })
    : (submissionKind === "academic"
      ? Object.freeze({ short: "vở chép đoạn văn", eyebrow: "NỘP VỞ CHÉP", title: "Buổi " + String(unitNumber).padStart(2, "0") + " · Nộp vở", file: "vo-chep" })
      : (submissionKind === "grammar"
        ? Object.freeze({ short: "bài chép ngữ pháp", eyebrow: "NỘP BÀI CHÉP NGỮ PHÁP", title: "Unit " + unitNumber + " · Nộp bài chép", file: "bai-chep-ngu-phap" })
        : (submissionKind === "ieltsWriting"
          ? Object.freeze({ short: "vở chép", eyebrow: "NỘP VỞ CHÉP", title: "Buổi " + String(unitNumber).padStart(2, "0") + " · Nộp vở chép" + (isWritingRoom ? " & viết bài" : ""), file: "vo-chep" })
          : (submissionKind === "ieltsReading"
            ? Object.freeze({ short: "sổ từ vựng", eyebrow: "NỘP SỔ TỪ VỰNG", title: "Buổi 1 · Nộp bài", file: "so-tu-vung" })
            : Object.freeze({ short: "sổ từ vựng", eyebrow: "NỘP SỔ TỪ VỰNG", title: "Unit " + unitNumber + " · Nộp bài", file: "so-tu-vung" })))));
  var outputName = assignmentCode + "-" + notebookCopy.file + ".pdf";

  var state = {
    images: [],
    pdfFile: null,
    generatedBlob: null,
    generatedUrl: "",
    videoFile: null,
    videoUrl: "",
    draggedId: "",
    preparing: false,
    submitting: false,
    submitted: false,
  };

  function query(selector) {
    return document.querySelector(selector);
  }

  function uniqueId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return "file-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  function clientSubmissionId() {
    var key = "vocabulary-direct-submission-" + assignmentCode;
    try {
      var existing = window.localStorage.getItem(key);
      if (existing) return existing;
      var created = uniqueId().replace(/[^A-Za-z0-9_-]/g, "");
      window.localStorage.setItem(key, created);
      return created;
    } catch (_error) {
      return uniqueId().replace(/[^A-Za-z0-9_-]/g, "");
    }
  }

  function formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
    return (bytes / 1024 / 1024).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1) + " MB";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;");
  }

  function isPdf(file) {
    return file.type === "application/pdf" || PDF_PATTERN.test(file.name);
  }

  function isImage(file) {
    return /^(?:image\/(?:jpeg|png|webp|heic|heif))$/i.test(file.type || "") || IMAGE_PATTERN.test(file.name);
  }

  function isHeic(file) {
    return /heic|heif/i.test(file.type || "") || /\.(?:heic|heif)$/i.test(file.name);
  }

  function isVideo(file) {
    return String(file.type || "").indexOf("video/") === 0 || VIDEO_PATTERN.test(file.name);
  }

  function revokePreparedPdf() {
    if (state.generatedUrl) URL.revokeObjectURL(state.generatedUrl);
    state.generatedUrl = "";
    state.generatedBlob = null;
  }

  function revokeImages() {
    state.images.forEach(function (item) {
      URL.revokeObjectURL(item.preview);
    });
    state.images = [];
  }

  function revokeVideo() {
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    state.videoUrl = "";
  }

  function setStatus(message, type) {
    var node = query("[data-status-message]");
    if (!node) return;
    node.textContent = message || "";
    node.dataset.type = type || "";
    node.hidden = !message;
  }

  function setProgress(kind, percent) {
    var safe = Math.max(0, Math.min(100, Math.round(percent || 0)));
    var progress = query(kind === "pdf" ? "[data-pdf-progress]" : "[data-video-progress]");
    var label = query(kind === "pdf" ? "[data-pdf-percent]" : "[data-video-percent]");
    if (progress) progress.value = safe;
    if (label) label.textContent = safe + "%";
  }

  function identity() {
    var studentName = String(query("[data-student-name]").value || "").trim();
    var className = String(query("[data-class-name]").value || "").trim();
    return {
      studentName: studentName,
      email: internalStudentKey(studentName, className),
      className: className,
    };
  }


  function internalStudentKey(studentName, className) {
    var normalized = [studentName, className]
      .map(function (value) {
        return String(value || "").normalize("NFKC").trim().toLowerCase();
      })
      .join("|");
    var hash = 2166136261;
    for (var index = 0; index < normalized.length; index += 1) {
      hash ^= normalized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return "student-" + (hash >>> 0).toString(16).padStart(8, "0") + "@no-email.invalid";
  }

  function notebookReady() {
    return Boolean(state.pdfFile || state.generatedBlob || state.images.length);
  }

  function countWords(value) {
    var normalized = String(value || "").trim();
    return normalized ? normalized.split(/\s+/).filter(Boolean).length : 0;
  }

  function writingData() {
    if (!isWritingRoom) return null;
    return {
      essays: Array.from(document.querySelectorAll("[data-essay-index]")).map(function (textarea) {
        return String(textarea.value || "").trim();
      }),
      confirmed: Boolean(query("[data-confirmation]").checked),
    };
  }

  function writingReady() {
    if (!isWritingRoom) return true;
    var data = writingData();
    return data.essays.length === writingAssignment.tasks.length && data.essays.every(function (essay, index) {
      return countWords(essay) >= writingAssignment.tasks[index].minWords;
    });
  }

  function writingStorageKey(suffix) {
    return requestedCode.toLowerCase() + "-" + suffix;
  }

  function saveWritingDrafts() {
    if (!isWritingRoom) return;
    try {
      document.querySelectorAll("[data-essay-index]").forEach(function (textarea, index) {
        localStorage.setItem(writingStorageKey("essay-" + (index + 1)), textarea.value);
      });
    } catch (_error) {}
  }

  function renderWordCount(number) {
    var textarea = query('[data-essay-index="' + number + '"]');
    var countNode = query('[data-word-count="' + number + '"]');
    var statusNode = query('[data-word-status="' + number + '"]');
    var minimum = writingAssignment.tasks[number - 1].minWords;
    var words = countWords(textarea && textarea.value);
    countNode.textContent = String(words);
    statusNode.textContent = words >= minimum ? "Đã đủ tối thiểu " + minimum + " từ" : "Chưa đủ " + minimum + " từ";
    statusNode.classList.toggle("is-ready", words >= minimum);
  }

  function renderWritingRoom() {
    var tabs = query("[data-task-tabs]");
    var tasks = query("[data-writing-tasks]");
    tabs.innerHTML = writingAssignment.tasks.map(function (_task, index) {
      var number = index + 1;
      return '<button type="button" class="task-tab' + (number === 1 ? ' is-active' : '') + '" data-task-tab="' + number + '" role="tab" aria-selected="' + (number === 1 ? 'true' : 'false') + '">ĐỀ ' + number + '</button>';
    }).join("");
    tasks.innerHTML = writingAssignment.tasks.map(function (task, index) {
      var number = index + 1;
      var prompt = task.type === "image"
        ? '<img src="' + escapeHtml(task.image) + '" alt="' + escapeHtml(task.alt || ("Đề " + number)) + '" />'
        : '<article class="writing-text-prompt"><small>' + escapeHtml(task.title || ("Đề " + number)) + '</small><p>' + escapeHtml(task.prompt).replace(/\n/g, "<br>") + '</p><strong>Write at least ' + task.minWords + ' words.</strong></article>';
      return '<div class="writing-task' + (number === 1 ? ' is-active' : '') + '" data-writing-task="' + number + '"' + (number === 1 ? '' : ' hidden') + '>' +
        '<div class="writing-prompt">' + prompt + '</div>' +
        '<div class="writing-editor"><label for="writing-essay-' + number + '">Bài viết Đề ' + number + '</label>' +
        '<textarea id="writing-essay-' + number + '" data-essay-index="' + number + '" rows="18" spellcheck="false" autocorrect="off" autocomplete="off" autocapitalize="sentences" placeholder="Viết bài hoàn chỉnh tại đây..."></textarea>' +
        '<div class="word-counter"><span>Word count</span><strong data-word-count="' + number + '">0</strong><em data-word-status="' + number + '">Chưa đủ ' + task.minWords + ' từ</em></div></div></div>';
    }).join("");
  }

  function selectWritingTask(number) {
    activeWritingTask = number;
    document.querySelectorAll("[data-task-tab]").forEach(function (button) {
      var active = Number(button.dataset.taskTab) === number;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll("[data-writing-task]").forEach(function (panel) {
      var active = Number(panel.dataset.writingTask) === number;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
  }

  function updateSubmitState() {
    var info = identity();
    if (submissionKind === "ieltsWriting") {
      query("[data-submit-button]").disabled = !(
        writingFormUrl &&
        info.studentName.length >= 2 &&
        Boolean(info.className) &&
        writingReady() &&
        Boolean(query("[data-confirmation]").checked)
      );
      return;
    }
    var ready =
      assignmentCode &&
      info.studentName.length >= 2 &&
      Boolean(info.className) &&
      notebookReady() &&
      writingReady() &&
      (notebookOnly || Boolean(state.videoFile)) &&
      Boolean(query("[data-confirmation]").checked) &&
      !state.preparing &&
      !state.submitting &&
      !state.submitted;
    query("[data-submit-button]").disabled = !ready;
  }

  function setControlsDisabled(disabled) {
    document
      .querySelectorAll("input, select, textarea, button")
      .forEach(function (node) {
        if (node.matches("[data-submit-button]") && !disabled) return;
        node.disabled = disabled;
      });
    if (!disabled) {
      renderNotebook();
      if (!notebookOnly) renderVideo();
      updateSubmitState();
    }
  }

  function resetPreparedPdf() {
    revokePreparedPdf();
    query("[data-download-pdf]").hidden = true;
    query("[data-pdf-ready]").hidden = true;
    updateSubmitState();
  }

  function createImageCard(item, index) {
    var card = document.createElement("article");
    card.className = "pdf-page";
    card.draggable = true;
    card.dataset.imageId = item.id;
    card.innerHTML =
      '<span class="page-number">' + (index + 1) + "</span>" +
      '<div class="page-preview"><img alt="Trang ' + (index + 1) + '" src="' + item.preview + '" /></div>' +
      '<p class="page-name">' + escapeHtml(item.file.name) + "</p>" +
      '<div class="page-actions">' +
      '<button type="button" data-move-up title="Đưa lên trước" aria-label="Đưa trang lên trước">↑</button>' +
      '<button type="button" data-move-down title="Đưa xuống sau" aria-label="Đưa trang xuống sau">↓</button>' +
      '<button type="button" data-rotate title="Xoay ảnh" aria-label="Xoay trang 90 độ">↻</button>' +
      '<button type="button" data-remove title="Xóa ảnh" aria-label="Xóa trang">×</button>' +
      "</div>";
    card.querySelector("img").style.transform = "rotate(" + item.rotation + "deg)";
    card.querySelector("[data-move-up]").disabled = index === 0 || state.submitting;
    card.querySelector("[data-move-down]").disabled = index === state.images.length - 1 || state.submitting;
    card.querySelector("[data-move-up]").addEventListener("click", function () {
      moveImage(item.id, -1);
    });
    card.querySelector("[data-move-down]").addEventListener("click", function () {
      moveImage(item.id, 1);
    });
    card.querySelector("[data-rotate]").addEventListener("click", function () {
      item.rotation = (item.rotation + 90) % 360;
      resetPreparedPdf();
      renderNotebook();
    });
    card.querySelector("[data-remove]").addEventListener("click", function () {
      removeImage(item.id);
    });
    card.addEventListener("dragstart", function () {
      state.draggedId = item.id;
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", function () {
      state.draggedId = "";
      card.classList.remove("is-dragging");
    });
    card.addEventListener("dragover", function (event) {
      event.preventDefault();
    });
    card.addEventListener("drop", function (event) {
      event.preventDefault();
      moveDraggedImage(item.id);
    });
    return card;
  }

  function renderNotebook() {
    var empty = query("[data-notebook-empty]");
    var chip = query("[data-pdf-chip]");
    var count = query("[data-image-count]");
    var list = query("[data-image-list]");
    var createButton = query("[data-create-pdf]");
    list.replaceChildren();

    if (state.pdfFile) {
      chip.hidden = false;
      chip.querySelector("strong").textContent = state.pdfFile.name;
      chip.querySelector("small").textContent = formatSize(state.pdfFile.size) + " · dùng trực tiếp";
    } else {
      chip.hidden = true;
    }

    state.images.forEach(function (item, index) {
      list.appendChild(createImageCard(item, index));
    });
    count.hidden = !state.images.length;
    if (state.images.length) {
      count.textContent =
        "Đã chọn " + state.images.length + " trang. Thứ tự hiện tại chính là thứ tự trang trong PDF.";
    }
    createButton.hidden = !state.images.length;
    createButton.disabled = state.preparing || state.submitting;
    empty.hidden = Boolean(state.pdfFile || state.images.length);
    updateSubmitState();
  }

  function renderVideo() {
    var empty = query("[data-video-empty]");
    var chip = query("[data-video-chip]");
    var preview = query("[data-video-preview]");
    if (!state.videoFile) {
      empty.hidden = false;
      chip.hidden = true;
      preview.hidden = true;
      preview.removeAttribute("src");
    } else {
      empty.hidden = true;
      chip.hidden = false;
      chip.querySelector("strong").textContent = state.videoFile.name;
      chip.querySelector("small").textContent = formatSize(state.videoFile.size);
      preview.src = state.videoUrl;
      preview.hidden = false;
    }
    updateSubmitState();
  }

  function chooseNotebookFiles(fileList) {
    if (state.submitting) return;
    var files = Array.from(fileList || []);
    if (!files.length) return;
    var pdfs = files.filter(isPdf);
    var images = files.filter(isImage);
    if (pdfs.length && (files.length !== 1 || images.length)) {
      setStatus("Chỉ chọn đúng 01 PDF, hoặc chọn nhiều ảnh; không trộn PDF với ảnh.", "error");
      return;
    }
    if (!pdfs.length && images.length !== files.length) {
      setStatus("Có tệp không phải PDF hoặc ảnh JPG, PNG, WEBP, HEIC/HEIF.", "error");
      return;
    }
    if (pdfs.length) {
      if (pdfs[0].size > MAX_PDF_BYTES) {
        setStatus("PDF vượt quá 100 MB. Em hãy giảm dung lượng rồi chọn lại.", "error");
        return;
      }
      revokeImages();
      resetPreparedPdf();
      state.pdfFile = pdfs[0];
      setStatus("Đã nhận PDF sổ từ vựng.", "success");
      renderNotebook();
      return;
    }
    if (state.pdfFile) {
      setStatus("Em đang có một PDF. Hãy xóa PDF trước khi chuyển sang chọn ảnh.", "error");
      return;
    }
    if (state.images.length + images.length > MAX_IMAGES) {
      setStatus("Mỗi bài nhận tối đa " + MAX_IMAGES + " ảnh.", "error");
      return;
    }
    var oversized = images.find(function (file) {
      return file.size > MAX_IMAGE_BYTES;
    });
    if (oversized) {
      setStatus("Ảnh " + oversized.name + " vượt quá 30 MB.", "error");
      return;
    }
    var known = new Set(
      state.images.map(function (item) {
        return item.file.name + "|" + item.file.size + "|" + item.file.lastModified;
      }),
    );
    images.forEach(function (file) {
      var signature = file.name + "|" + file.size + "|" + file.lastModified;
      if (known.has(signature)) return;
      known.add(signature);
      state.images.push({
        id: uniqueId(),
        file: file,
        preview: URL.createObjectURL(file),
        rotation: 0,
      });
    });
    resetPreparedPdf();
    setStatus("Đã thêm ảnh. Em hãy kiểm tra số trang, thứ tự và chiều ảnh.", "success");
    renderNotebook();
  }

  function chooseVideo(file) {
    if (!file || state.submitting) return;
    if (!isVideo(file)) {
      setStatus("Tệp đã chọn không phải video.", "error");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setStatus("Video vượt quá 1 GB. Em hãy giảm dung lượng rồi chọn lại.", "error");
      return;
    }
    revokeVideo();
    state.videoFile = file;
    state.videoUrl = URL.createObjectURL(file);
    setStatus("Đã nhận video trả từ.", "success");
    renderVideo();
  }

  function moveImage(id, direction) {
    var index = state.images.findIndex(function (item) {
      return item.id === id;
    });
    var destination = index + direction;
    if (index < 0 || destination < 0 || destination >= state.images.length) return;
    var moved = state.images.splice(index, 1)[0];
    state.images.splice(destination, 0, moved);
    resetPreparedPdf();
    renderNotebook();
  }

  function moveDraggedImage(targetId) {
    if (!state.draggedId || state.draggedId === targetId) return;
    var from = state.images.findIndex(function (item) {
      return item.id === state.draggedId;
    });
    var to = state.images.findIndex(function (item) {
      return item.id === targetId;
    });
    if (from < 0 || to < 0) return;
    var moved = state.images.splice(from, 1)[0];
    state.images.splice(to, 0, moved);
    resetPreparedPdf();
    renderNotebook();
  }

  function removeImage(id) {
    var index = state.images.findIndex(function (item) {
      return item.id === id;
    });
    if (index < 0) return;
    URL.revokeObjectURL(state.images[index].preview);
    state.images.splice(index, 1);
    resetPreparedPdf();
    renderNotebook();
  }

  function loadImage(blob) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(blob);
      var image = new Image();
      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Không đọc được một ảnh. Em hãy chụp/lưu lại ảnh rồi thử lại."));
      };
      image.src = url;
    });
  }

  async function normalizeImage(item) {
    var source = item.file;
    if (isHeic(item.file)) {
      if (typeof window.heic2any !== "function") {
        throw new Error("Thiết bị chưa xử lý được ảnh HEIC. Em hãy đổi ảnh sang JPG rồi thử lại.");
      }
      var converted = await window.heic2any({ blob: item.file, toType: "image/jpeg", quality: 0.88 });
      source = Array.isArray(converted) ? converted[0] : converted;
    }
    var image = await loadImage(source);
    var sourceWidth = image.naturalWidth || image.width;
    var sourceHeight = image.naturalHeight || image.height;
    var scaleDown = Math.min(1, 2200 / Math.max(sourceWidth, sourceHeight));
    var width = Math.max(1, Math.round(sourceWidth * scaleDown));
    var height = Math.max(1, Math.round(sourceHeight * scaleDown));
    var quarterTurn = Math.abs(item.rotation % 180) === 90;
    var canvas = document.createElement("canvas");
    canvas.width = quarterTurn ? height : width;
    canvas.height = quarterTurn ? width : height;
    var context = canvas.getContext("2d");
    if (!context) throw new Error("Thiết bị chưa thể xử lý ảnh. Em hãy dùng Chrome hoặc Safari mới nhất.");
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate((item.rotation * Math.PI) / 180);
    context.drawImage(image, -width / 2, -height / 2, width, height);
    return await new Promise(function (resolve, reject) {
      canvas.toBlob(
        function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Không thể tạo ảnh PDF trên thiết bị này."));
        },
        "image/jpeg",
        0.86,
      );
    });
  }

  async function preparePdf(options) {
    options = options || {};
    if (state.pdfFile) return state.pdfFile;
    if (state.generatedBlob) return state.generatedBlob;
    if (!state.images.length) throw new Error("Em chưa chọn PDF hoặc ảnh sổ từ vựng.");
    if (!window.PDFLib || !window.PDFLib.PDFDocument) {
      throw new Error("Bộ ghép PDF chưa tải xong. Em hãy đợi vài giây rồi thử lại.");
    }
    state.preparing = true;
    updateSubmitState();
    setStatus("Đang ghép ảnh theo đúng thứ tự đã sắp xếp…", "progress");
    try {
      var pdf = await window.PDFLib.PDFDocument.create();
      // Keep image-generated PDFs byte-stable across a reload. This lets an
      // interrupted resumable upload recognize the same ordered image set
      // instead of treating a new creation timestamp as a different file.
      var stablePdfDate = new Date("2000-01-01T00:00:00.000Z");
      pdf.setCreationDate(stablePdfDate);
      pdf.setModificationDate(stablePdfDate);
      var pageWidth = 595.28;
      var pageHeight = 841.89;
      var margin = 22;
      for (var index = 0; index < state.images.length; index += 1) {
        setStatus("Đang xử lý trang " + (index + 1) + "/" + state.images.length + "…", "progress");
        var blob = await normalizeImage(state.images[index]);
        var embedded = await pdf.embedJpg(await blob.arrayBuffer());
        var scale = Math.min(
          (pageWidth - margin * 2) / embedded.width,
          (pageHeight - margin * 2) / embedded.height,
        );
        var drawWidth = embedded.width * scale;
        var drawHeight = embedded.height * scale;
        var page = pdf.addPage([pageWidth, pageHeight]);
        page.drawImage(embedded, {
          x: (pageWidth - drawWidth) / 2,
          y: (pageHeight - drawHeight) / 2,
          width: drawWidth,
          height: drawHeight,
        });
      }
      var bytes = await pdf.save();
      if (bytes.byteLength > MAX_PDF_BYTES) {
        throw new Error("PDF sau khi ghép vượt quá 100 MB. Em hãy giảm số ảnh hoặc dung lượng ảnh.");
      }
      revokePreparedPdf();
      state.generatedBlob = new Blob([bytes], { type: "application/pdf" });
      state.generatedUrl = URL.createObjectURL(state.generatedBlob);
      query("[data-download-pdf]").hidden = false;
      query("[data-pdf-ready]").hidden = false;
      query("[data-pdf-ready]").textContent =
        "Đã ghép xong " + state.images.length + " trang · " + formatSize(state.generatedBlob.size) + ".";
      setStatus("Đã tạo PDF theo đúng thứ tự ảnh.", "success");
      if (options.download) downloadPdf();
      return state.generatedBlob;
    } finally {
      state.preparing = false;
      renderNotebook();
    }
  }

  function downloadPdf() {
    if (!state.generatedUrl) return;
    var link = document.createElement("a");
    link.href = state.generatedUrl;
    link.download = outputName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || "").split(",")[1] || "");
      };
      reader.onerror = function () {
        reject(new Error("Không đọc được tệp này. Em hãy chọn lại tệp rồi thử lại."));
      };
      reader.readAsDataURL(blob);
    });
  }

  function blobToBytes(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(new Uint8Array(reader.result));
      };
      reader.onerror = function () {
        reject(new Error("Không đọc được tệp này. Em hãy chọn lại tệp rồi thử lại."));
      };
      reader.readAsArrayBuffer(blob);
    });
  }

  async function fingerprintFile(file, submittedName, submittedType) {
    if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== "function"
        || typeof window.TextEncoder !== "function") {
      throw new Error("Trình duyệt này chưa phù hợp để nộp tệp. Em hãy mở bằng Chrome mới nhất.");
    }
    var name = String(submittedName || file.name || "");
    var type = String(submittedType || file.type || "application/octet-stream")
      .trim().toLowerCase().split(";")[0];
    var size = Number(file.size) || 0;
    var firstEnd = Math.min(size, FINGERPRINT_WINDOW_BYTES);
    var lastStart = Math.max(0, size - FINGERPRINT_WINDOW_BYTES);
    var parts = await Promise.all([
      blobToBytes(file.slice(0, firstEnd)),
      blobToBytes(file.slice(lastStart, size)),
    ]);
    var descriptor = new window.TextEncoder().encode(
      "VOCAB-FP1\n" + JSON.stringify([name, type, size]) + "\n",
    );
    var joined = new Uint8Array(descriptor.length + parts[0].length + parts[1].length);
    joined.set(descriptor, 0);
    joined.set(parts[0], descriptor.length);
    joined.set(parts[1], descriptor.length + parts[0].length);
    var digest = new Uint8Array(await window.crypto.subtle.digest("SHA-256", joined));
    return Array.from(digest, function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function postToBackend(payload, timeoutMs) {
    if (!API_BASE || /^__/.test(API_BASE)) {
      return Promise.reject(new Error("Trang nộp bài đang tạm thời chưa sẵn sàng. Em hãy báo cô Trang."));
    }
    var requestId = uniqueId();
    return new Promise(function (resolve, reject) {
      var frameName = "vf2-drive-bridge-" + requestId;
      var frame = document.createElement("iframe");
      frame.name = frameName;
      frame.title = "Đang gửi bài";
      frame.hidden = true;
      var form = document.createElement("form");
      form.method = "POST";
      form.action = API_BASE;
      form.target = frameName;
      form.acceptCharset = "UTF-8";
      form.hidden = true;
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(
        Object.assign({}, payload, {
          requestId: requestId,
          clientOrigin: window.location.origin,
        }),
      );
      form.appendChild(input);

      function cleanup() {
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timeout);
        frame.remove();
        form.remove();
      }
      function onMessage(event) {
        var data = event.data || {};
        var originHost = "";
        try {
          originHost = new URL(event.origin).hostname;
        } catch (_originError) {
          return;
        }
        var isLegacyAppsScriptBridge = originHost === "script.google.com"
          || originHost.endsWith(".googleusercontent.com");
        // Apps Script wraps HtmlService in one or more sandbox frames. The
        // GitHub return page therefore broadcasts from a nested WindowProxy,
        // not necessarily from frame.contentWindow. Same-origin plus the
        // per-request random requestId is the authoritative callback check.
        var isSameOriginReturnBridge = event.origin === window.location.origin;
        if (!isLegacyAppsScriptBridge && !isSameOriginReturnBridge) return;
        if (data.source !== BRIDGE_SOURCE || data.requestId !== requestId || !data.result) return;
        cleanup();
        if (!data.result.ok) {
          var failure = new Error(studentFacingError(data.result));
          failure.code = String(data.result.code || "");
          reject(failure);
        } else resolve(data.result);
      }
      var timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error("Việc gửi bài đang mất nhiều thời gian. Em hãy giữ nguyên trang và thử lại."));
      }, Number(timeoutMs) > 0 ? Number(timeoutMs) : 180000);
      window.addEventListener("message", onMessage);
      document.body.append(frame, form);
      form.submit();
    });
  }

  function studentFacingError(result) {
    var code = String(result && result.code || "");
    if (code === "DUPLICATE") {
      return "Bài này đã được nộp. Nếu cần nộp lại, em hãy báo cô Trang.";
    }
    if (code === "ACTIVE_ON_OTHER_DEVICE" || code === "ATTEMPT_EXISTS") {
      return "Bài nộp đang được thực hiện trên thiết bị khác. Em hãy quay lại thiết bị đó hoặc báo cô Trang.";
    }
    if (code === "BAD_ASSIGNMENT") {
      return "Link bài nộp chưa đúng. Em hãy mở lại từ trang bài học.";
    }
    if (code === "DAILY_START_LIMIT" || code === "DAILY_BYTES_LIMIT") {
      return "Hiện chưa thể nhận thêm bài. Em hãy báo cô Trang.";
    }
    return "Chưa nộp được bài. Em hãy giữ nguyên trang và thử lại.";
  }

  function retryDelay(attempt) {
    return Math.min(12000, 700 * Math.pow(2, attempt - 1))
      + Math.floor(Math.random() * 900);
  }

  function retryableControlError(error) {
    var code = String(error && error.code || "");
    return !code || code === "SERVER_ERROR" || code === "DRIVE_UPLOAD_RETRY";
  }

  async function postControlWithRetry(payload) {
    var maxAttempts = 6;
    var lastError;
    for (var attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await postToBackend(payload, 65000);
      } catch (error) {
        lastError = error;
        if (!retryableControlError(error) || attempt === maxAttempts) throw error;
        setStatus("Nhiều bạn đang nộp cùng lúc. Trang sẽ tự tiếp tục…", "progress");
        await new Promise(function (resolve) {
          window.setTimeout(resolve, retryDelay(attempt));
        });
      }
    }
    throw lastError;
  }

  async function probeUploadOffset(token, upload, total) {
    return await postToBackend({
      action: "uploadChunk",
      assignmentCode: assignmentCode,
      token: token,
      uploadId: upload.uploadId,
      total: total,
      probe: true,
    }, 65000);
  }

  async function uploadFileByChunks(token, upload, file, onProgress) {
    var total = file.size;
    var chunkBytes = Number(upload.chunkSize) || CHUNK_BYTES;
    var offset = Math.max(0, Number(upload.nextOffset) || 0);
    var fileId = String(upload.fileId || "");
    if (Number(upload.size) !== total || offset > total) {
      throw new Error("Tệp đã thay đổi trong lúc nộp. Em hãy chọn lại đúng tệp rồi thử lại.");
    }
    if (upload.completed) {
      if (!fileId) throw new Error("Tệp chưa được ghi nhận hoàn tất. Em hãy thử lại.");
      onProgress(100);
      return fileId;
    }
    onProgress((offset / total) * 100);
    while (offset < total) {
      var end = Math.min(offset + chunkBytes, total);
      var chunk = file.slice(offset, end);
      var base64 = await blobToBase64(chunk);
      var result;
      var lastError;
      // Apps Script has a per-owner concurrency ceiling. When a whole class
      // submits together, short-lived chunk requests can temporarily queue or
      // be rejected. Keep the same resumable session and retry with jitter so
      // students do not have to restart a large video from zero.
      var maxChunkAttempts = 8;
      for (var attempt = 1; attempt <= maxChunkAttempts; attempt += 1) {
        try {
          result = await postToBackend({
            action: "uploadChunk",
            assignmentCode: assignmentCode,
            token: token,
            uploadId: upload.uploadId,
            offset: offset,
            total: total,
            dataBase64: base64,
          }, 65000);
          break;
        } catch (error) {
          lastError = error;
          try {
            var probe = await probeUploadOffset(token, upload, total);
            if (Number(probe.nextOffset) > offset || probe.completed) {
              result = probe;
              break;
            }
          } catch (_probeError) {
            // Keep the original error; a later retry may recover the Drive session.
          }
          if (attempt < maxChunkAttempts) {
            await new Promise(function (resolve) {
              window.setTimeout(resolve, retryDelay(attempt));
            });
          }
        }
      }
      if (!result) throw lastError || new Error("Chưa gửi được tệp. Em hãy giữ nguyên trang và thử lại.");
      var received = Number(result.nextOffset);
      if (!Number.isFinite(received) || received < offset || received > total) {
        throw new Error("Có lỗi khi chuẩn bị nơi nhận tệp. Em hãy thử lại.");
      }
      if (result.fileId) fileId = result.fileId;
      if (result.completed) {
        offset = total;
      } else {
        if (received === offset) {
          throw new Error("Một phần tệp chưa được gửi xong. Em hãy giữ nguyên trang và thử lại.");
        }
        offset = received;
      }
      onProgress((offset / total) * 100);
    }
    if (!fileId) {
      var finalProbe = await probeUploadOffset(token, upload, total);
      fileId = finalProbe.fileId || "";
    }
    if (!fileId) throw new Error("Tệp chưa được gửi xong. Em hãy thử lại.");
    return fileId;
  }

  async function submitAll() {
    if (state.submitting || state.submitted || query("[data-submit-button]").disabled) return;
    var info = identity();
    state.submitting = true;
    setControlsDisabled(true);
    query("[data-upload-progress]").hidden = false;
    setProgress("pdf", 0);
    if (!notebookOnly) setProgress("video", 0);
    try {
      var notebook = await preparePdf();
      var pdfName = state.pdfFile ? state.pdfFile.name : outputName;
      var videoType = notebookOnly ? "" : (state.videoFile.type || "application/octet-stream");
      setStatus(notebookOnly ? "Đang kiểm tra PDF…" : "Đang kiểm tra PDF và video…", "progress");
      var fingerprints = notebookOnly
        ? [await fingerprintFile(notebook, pdfName, "application/pdf")]
        : await Promise.all([
          fingerprintFile(notebook, pdfName, "application/pdf"),
          fingerprintFile(state.videoFile, state.videoFile.name, videoType),
        ]);
      setStatus("Đang chuẩn bị nộp bài…", "progress");
      var start = await postControlWithRetry({
        action: "start",
        assignmentCode: assignmentCode,
        clientSubmissionId: clientSubmissionId(),
        studentName: info.studentName,
        email: info.email,
        className: info.className,
        writing: writingData(),
        files: {
          notebook: {
            name: pdfName,
            type: "application/pdf",
            size: notebook.size,
            fingerprint: fingerprints[0],
          },
          video: notebookOnly ? null : {
            name: state.videoFile.name,
            type: videoType,
            size: state.videoFile.size,
            fingerprint: fingerprints[1],
          },
        },
      });
      if (!start.token || !start.uploads || !start.uploads.notebook || (!notebookOnly && !start.uploads.video)) {
        throw new Error("Chưa thể bắt đầu nộp bài. Em hãy thử lại.");
      }

      setStatus("Đang gửi PDF sổ từ vựng…", "progress");
      var notebookId = await uploadFileByChunks(start.token, start.uploads.notebook, notebook, function (percent) {
        setProgress("pdf", percent);
      });
      var videoId = "";
      if (!notebookOnly) {
        setStatus("PDF đã gửi xong. Đang gửi video trả từ…", "progress");
        videoId = await uploadFileByChunks(start.token, start.uploads.video, state.videoFile, function (percent) {
          setProgress("video", percent);
        });
      }
      setStatus("Đang hoàn tất bài nộp…", "progress");
      var finished = await postControlWithRetry({
        action: "finalize",
        assignmentCode: assignmentCode,
        token: start.token,
        files: {
          notebookId: notebookId,
          videoId: videoId,
        },
      });
      state.submitted = true;
      if (isWritingRoom) {
        try {
          writingAssignment.tasks.forEach(function (_task, index) {
            localStorage.removeItem(writingStorageKey("essay-" + (index + 1)));
          });
        } catch (_error) {}
      }
      setStatus(notebookOnly ? "Đã nộp PDF thành công." : "Đã nộp PDF và video thành công.", "success");
      var success = query("[data-success-card]");
      success.hidden = false;
      var pdfLink = query("[data-pdf-result]");
      var videoLink = query("[data-video-result]");
      if (finished.pdfUrl) pdfLink.href = finished.pdfUrl;
      else pdfLink.hidden = true;
      if (!notebookOnly && finished.videoUrl) videoLink.href = finished.videoUrl;
      else videoLink.hidden = true;
      query("[data-submit-button]").hidden = true;
      success.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      setStatus(
        error && error.message ? error.message : "Chưa nộp được bài. Em hãy giữ nguyên trang và thử lại.",
        "error",
      );
    } finally {
      state.submitting = false;
      if (!state.submitted) setControlsDisabled(false);
    }
  }

  function openWritingForm() {
    if (!writingFormUrl || query("[data-submit-button]").disabled) return;
    saveWritingDrafts();
    var opened = window.open(writingFormUrl, "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = writingFormUrl;
  }

  function showInvalidCode() {
    document.title = "Mã bài không hợp lệ";
    query("[data-page-title]").textContent = "Mã bài không hợp lệ";
    query("[data-assignment-code]").textContent = requestedCode || "—";
    query("[data-code-chip]").textContent = "CHƯA CÓ MÃ";
    document.querySelectorAll(".submit-card").forEach(function (card) {
      card.hidden = true;
    });
    setStatus("Đường dẫn chưa có mã Unit hợp lệ. Em hãy mở lại từ trang bài học.", "error");
  }

  function init() {
    if (!assignmentCode) {
      showInvalidCode();
      return;
    }
    document.title = assignmentCode + " · Nộp bài " + program.name;
    query("[data-page-title]").textContent = notebookCopy.title;
    query("[data-assignment-code]").textContent = assignmentCode;
    query("[data-code-chip]").textContent = assignmentCode;
    document.querySelectorAll("[data-program-name]").forEach(function (node) {
      node.textContent = program.name.toUpperCase();
    });
    if (program.classes && query("[data-class-name]")) {
      var classSelect = query("[data-class-name]");
      classSelect.innerHTML = "";
      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Chọn lớp";
      classSelect.appendChild(placeholder);
      program.classes.forEach(function (className) {
        var option = document.createElement("option");
        option.value = className;
        option.textContent = className;
        classSelect.appendChild(option);
      });
    }

    if (notebookOnly && submissionKind !== "ieltsWriting") {
      query(".submit-hero .eyebrow").textContent = notebookCopy.eyebrow;
      query(".hero-code small").textContent = "Mã bài đã được chọn sẵn; em không cần nhập lại.";
      query(".submit-hero > div > p:not(.eyebrow)").innerHTML =
        "Chọn <strong>01 PDF có sẵn</strong> hoặc <strong>nhiều ảnh theo đúng thứ tự</strong>; trang sẽ tự ghép ảnh thành một PDF để gửi cho cô Trang.";
      query(".notebook-card .section-title p").textContent = notebookCopy.short.toUpperCase();
      query("[data-notebook-empty]").textContent = "Chưa chọn PDF hoặc ảnh " + notebookCopy.short + ".";
      query(".video-card").hidden = true;
      var progressRows = document.querySelectorAll("[data-upload-progress] > div");
      if (progressRows[0]) progressRows[0].querySelector("span").textContent = "PDF " + notebookCopy.short;
      if (progressRows[1]) progressRows[1].hidden = true;
      query(".final-card .section-title > span").textContent = "03";
      query(".final-card .section-title p").textContent = "KIỂM TRA & NỘP BÀI";
      query(".final-card .section-title h2").textContent = "Gửi PDF " + notebookCopy.short;
      query("[data-confirmation] + span").textContent =
        "Em đã kiểm tra đúng mã bài, đúng thứ tự và chiều ảnh, PDF có đủ trang.";
      query("[data-submit-button]").textContent = "NỘP PDF";
      query("[data-success-card] p").textContent = "Cô Trang đã nhận được PDF " + notebookCopy.short + " của em.";
      query("[data-video-result]").hidden = true;
    }

    if (isWritingRoom) {
      renderWritingRoom();
      query("[data-writing-room]").hidden = false;
      query(".submit-hero .eyebrow").textContent = "NỘP VỞ CHÉP & VIẾT BÀI";
      query(".submit-hero > div > p:not(.eyebrow)").innerHTML =
        "Nộp <strong>vở chép</strong>, sau đó viết đủ <strong>" + writingAssignment.tasks.length + " bài</strong> theo đúng đề Buổi " + String(unitNumber).padStart(2, "0") + " trong phòng viết bên dưới. Bài luyện tập này <strong>không tính giờ</strong>.";
      query("[data-writing-heading]").textContent = "Viết " + writingAssignment.tasks.length + " bài theo đúng đề Buổi " + String(unitNumber).padStart(2, "0");
      query(".final-card .section-title > span").textContent = "04";
      query(".final-card .section-title h2").textContent = "Nộp PDF vở chép và " + writingAssignment.tasks.length + " bài viết";
      query("[data-confirmation] + span").textContent =
        "Em xác nhận mỗi bài đã đủ số từ tối thiểu, không dùng từ viết tắt hoặc ngôn ngữ văn nói, đã dùng cấu trúc học trên lớp và toàn bộ bài do em tự viết.";
      query("[data-submit-button]").textContent = "NỘP VỞ CHÉP + " + writingAssignment.tasks.length + " BÀI VIẾT";
      query("[data-success-card] p").textContent = "Cô Trang đã nhận được PDF vở chép và " + writingAssignment.tasks.length + " bài viết của em.";
      try {
        document.querySelectorAll("[data-essay-index]").forEach(function (textarea, index) {
          textarea.value = localStorage.getItem(writingStorageKey("essay-" + (index + 1))) || "";
        });
      } catch (_error) {}
      writingAssignment.tasks.forEach(function (_task, index) { renderWordCount(index + 1); });
      document.querySelectorAll("[data-task-tab]").forEach(function (button) {
        button.addEventListener("click", function () { selectWritingTask(Number(button.dataset.taskTab)); });
      });
      document.querySelectorAll("[data-essay-index]").forEach(function (textarea) {
        textarea.addEventListener("input", function () {
          saveWritingDrafts();
          renderWordCount(Number(textarea.dataset.essayIndex));
          updateSubmitState();
        });
      });
    }

    if (submissionKind === "ieltsWriting") {
      query(".notebook-card").hidden = true;
      query(".video-card").hidden = true;
      query("[data-upload-progress]").hidden = true;
      query(".submit-hero .eyebrow").textContent = "IELTS WRITING";
      query(".submit-hero > div > p:not(.eyebrow)").innerHTML = isWritingRoom
        ? "Viết đủ bài trong phòng viết, kiểm tra số từ, sau đó chọn ảnh vở và nộp vào đúng Form của buổi học."
        : "Điền đúng họ tên và lớp, sau đó chọn ảnh vở và nộp vào đúng Form của buổi học.";
      query(".final-card .section-title > span").textContent = isWritingRoom ? "03" : "02";
      query(".final-card .section-title p").textContent = "NỘP ẢNH VỞ";
      query(".final-card .section-title h2").textContent = "Mở Form ảnh của Buổi " + String(unitNumber).padStart(2, "0");
      query("[data-confirmation] + span").textContent = isWritingRoom
        ? "Em xác nhận đã viết đủ số từ tối thiểu và đã chuẩn bị ảnh vở rõ nét, đúng chiều."
        : "Em xác nhận đã chuẩn bị đủ ảnh vở rõ nét, đúng chiều và đúng buổi học.";
      query("[data-submit-button]").textContent = "CHỌN ẢNH & NỘP BÀI";
      query("[data-success-card]").hidden = true;
    }


    if (submissionKind !== "ieltsWriting") {
      query("[data-notebook-input]").addEventListener("change", function (event) {
        chooseNotebookFiles(event.currentTarget.files);
        event.currentTarget.value = "";
      });
      query("[data-remove-pdf]").addEventListener("click", function () {
        state.pdfFile = null;
        resetPreparedPdf();
        renderNotebook();
      });
      query("[data-create-pdf]").addEventListener("click", function () {
        preparePdf({ download: false }).catch(function (error) {
          setStatus(error.message, "error");
        });
      });
      query("[data-download-pdf]").addEventListener("click", downloadPdf);
    }
    if (!notebookOnly) {
      query("[data-video-input]").addEventListener("change", function (event) {
        chooseVideo(event.currentTarget.files && event.currentTarget.files[0]);
        event.currentTarget.value = "";
      });
      query("[data-remove-video]").addEventListener("click", function () {
        state.videoFile = null;
        revokeVideo();
        renderVideo();
      });
    }
    query("[data-submit-button]").addEventListener("click", submissionKind === "ieltsWriting" ? openWritingForm : submitAll);
    document
      .querySelectorAll("[data-student-name], [data-class-name], [data-confirmation], [data-essay-index]")
      .forEach(function (node) {
        node.addEventListener("input", updateSubmitState);
        node.addEventListener("change", updateSubmitState);
      });
    if (submissionKind !== "ieltsWriting") renderNotebook();
    if (!notebookOnly) renderVideo();
    updateSubmitState();
  }

  window.addEventListener("beforeunload", function (event) {
    if (isWritingRoom && !state.submitted) saveWritingDrafts();
    if (state.submitting) {
      event.preventDefault();
      event.returnValue = "";
      return "";
    }
    revokePreparedPdf();
    revokeImages();
    if (!notebookOnly) revokeVideo();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
