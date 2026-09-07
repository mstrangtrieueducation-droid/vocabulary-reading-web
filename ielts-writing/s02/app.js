(function () {
  "use strict";

  var STORAGE_KEY = "mstt-reading-b02-v1";
  var VOCAB_KEY = "mstt-reading-b02-vocab-v2";
  var CLASS_OPTIONS = [
    "IELTS 40", "IELTS 41", "IELTS 42", "IELTS 43", "IELTS 44", "IELTS 45", "IELTS 46",
    "IELTS 47", "IELTS 48", "IELTS 49", "IELTS 50", "IELTS 51", "IELTS 52", "IELTS 53"
  ];

  // Danh sách cô cung cấp: giữ nguyên số thứ tự, nhóm từ và nghĩa của từng dòng.
  var VOCABULARY = {
    p2: [
      { number: 55, word: "policy (n)", speak: "policy", phonetic: "/ˈpɒləsi/", pos: "noun", meaning: "chính sách", example: "The government revised its water policy.", exampleVi: "Chính phủ đã điều chỉnh chính sách về nước." },
      { number: 56, word: "revise (v) → revision (n)", speak: "revise, revision", phonetic: "/rɪˈvaɪz/ · /rɪˈvɪʒn/", pos: "verb · noun", meaning: "ôn tập → chỉnh sửa, điều chỉnh", example: "Revise the plan before submitting the final revision.", exampleVi: "Hãy ôn lại và chỉnh kế hoạch trước khi nộp bản điều chỉnh cuối cùng." },
      { number: 57, word: "meet (v) a challenge / need / demand...", speak: "meet a challenge, meet a need, meet a demand", phonetic: "/miːt/", pos: "verb", meaning: "đáp ứng thử thách / yêu cầu / nhu cầu...", example: "The new system must meet growing demand.", exampleVi: "Hệ thống mới phải đáp ứng nhu cầu ngày càng tăng." },
      { number: 58, word: "irrigate (v) → irrigation (n)", speak: "irrigate, irrigation", phonetic: "/ˈɪrɪɡeɪt/ · /ˌɪrɪˈɡeɪʃn/", pos: "verb · noun", meaning: "tưới tiêu (nông nghiệp)", example: "Farmers irrigate the fields with a modern irrigation system.", exampleVi: "Nông dân tưới ruộng bằng một hệ thống tưới tiêu hiện đại." },
      { number: 59, word: "relevant (a) → relevance (n)", speak: "relevant, relevance", phonetic: "/ˈreləvənt/ · /ˈreləvəns/", pos: "adjective · noun", meaning: "liên quan", example: "Choose only information relevant to the question.", exampleVi: "Chỉ chọn thông tin liên quan đến câu hỏi." },
      { number: 60, word: "address (v) = solve", speak: "address", phonetic: "/əˈdres/", pos: "verb", meaning: "giải quyết vấn đề", example: "The project aims to address water shortages.", exampleVi: "Dự án nhằm giải quyết tình trạng thiếu nước." },
      { number: 61, word: "manipulate (v)", speak: "manipulate", phonetic: "/məˈnɪpjuleɪt/", pos: "verb", meaning: "thao túng, kiểm soát", example: "Engineers learned to manipulate the flow of water.", exampleVi: "Các kĩ sư học cách kiểm soát dòng nước." },
      { number: 62, word: "dam (n)", speak: "dam", phonetic: "/dæm/", pos: "noun", meaning: "đập nước", example: "The dam stores water for the dry season.", exampleVi: "Đập nước tích trữ nước cho mùa khô." },
      { number: 63, word: "pipe (n)", speak: "pipe", phonetic: "/paɪp/", pos: "noun", meaning: "ống nước", example: "Water travels through a network of pipes.", exampleVi: "Nước chảy qua một mạng lưới ống nước." },
      { number: 64, word: "revolution (n)", speak: "revolution", phonetic: "/ˌrevəˈluːʃn/", pos: "noun", meaning: "cuộc cách mạng", example: "The industrial revolution changed water use.", exampleVi: "Cuộc cách mạng công nghiệp đã thay đổi việc sử dụng nước." },
      { number: 65, word: "pace (n) → keep pace with sb/st", speak: "pace, keep pace with", phonetic: "/peɪs/", pos: "noun · phrase", meaning: "tốc độ, nhịp độ → bắt kịp ai / cái gì", example: "Supply could not keep pace with demand.", exampleVi: "Nguồn cung không thể bắt kịp nhu cầu." },
      { number: 66, word: "sanitation (n)", speak: "sanitation", phonetic: "/ˌsænɪˈteɪʃn/", pos: "noun", meaning: "sự vệ sinh", example: "Clean water is essential for sanitation.", exampleVi: "Nước sạch rất cần thiết cho vệ sinh." },
      { number: 67, word: "inferior (a) to sb/st", speak: "inferior to", phonetic: "/ɪnˈfɪəriə(r)/", pos: "adjective", meaning: "thấp kém hơn ai / cái gì", example: "This system is inferior to the newer one.", exampleVi: "Hệ thống này kém hơn hệ thống mới." },
      { number: 68, word: "adequate (a) = sufficient", speak: "adequate, sufficient", phonetic: "/ˈædɪkwət/", pos: "adjective", meaning: "đủ, đầy đủ", example: "The city needs an adequate water supply.", exampleVi: "Thành phố cần một nguồn cung nước đầy đủ." },
      { number: 69, word: "imitate (v)", speak: "imitate", phonetic: "/ˈɪmɪteɪt/", pos: "verb", meaning: "bắt chước", example: "Later societies tried to imitate the system.", exampleVi: "Các xã hội sau này đã cố bắt chước hệ thống đó." },
      { number: 70, word: "beyond (prep)", speak: "beyond", phonetic: "/bɪˈjɒnd/", pos: "preposition", meaning: "ngoài, vượt ngoài...", example: "The effects spread beyond the city.", exampleVi: "Ảnh hưởng lan ra ngoài thành phố." },
      { number: 71, word: "consequence (n) = result", speak: "consequence, result", phonetic: "/ˈkɒnsɪkwəns/", pos: "noun", meaning: "= result", example: "Water pollution was an unintended consequence.", exampleVi: "Ô nhiễm nước là một hệ quả ngoài dự kiến." },
      { number: 72, word: "decade (n) / century (n) / millennium (n)", speak: "decade, century, millennium", phonetic: "/ˈdekeɪd/ · /ˈsentʃəri/ · /mɪˈleniəm/", pos: "nouns", meaning: "decade · century · millennium", example: "The system developed over decades, centuries and millennia.", exampleVi: "Hệ thống phát triển qua nhiều thập kỉ, thế kỉ và thiên niên kỉ." },
      { number: 73, word: "thrive (v) = prosper = flourish", speak: "thrive, prosper, flourish", phonetic: "/θraɪv/", pos: "verb", meaning: "phát triển rực rỡ, hưng thịnh", example: "Cities thrive when water is reliable.", exampleVi: "Các thành phố phát triển hưng thịnh khi nguồn nước ổn định." },
      { number: 74, word: "tense (a) → tension (n)", speak: "tense, tension", phonetic: "/tens/ · /ˈtenʃn/", pos: "adjective · noun", meaning: "căng thẳng", example: "The tense dispute created political tension.", exampleVi: "Cuộc tranh cãi căng thẳng tạo ra sự căng thẳng chính trị." },
      { number: 75, word: "dispute (v) (n) → indisputable (a)", speak: "dispute, indisputable", phonetic: "/dɪˈspjuːt/ · /ˌɪndɪˈspjuːtəbl/", pos: "verb · noun · adjective", meaning: "sự tranh cãi, sự xung đột", example: "The benefits are indisputable despite the dispute.", exampleVi: "Lợi ích là không thể tranh cãi dù vẫn có xung đột." },
      { number: 76, word: "at the outset of = at the beginning of", speak: "at the outset of, at the beginning of", phonetic: "/æt ði ˈaʊtset əv/", pos: "phrase", meaning: "= at the beginning of", example: "At the outset of the project, demand was low.", exampleVi: "Vào lúc bắt đầu dự án, nhu cầu còn thấp." },
      { number: 77, word: "priority (n) → prioritize (v)", speak: "priority, prioritize", phonetic: "/praɪˈɒrəti/ · /praɪˈɒrətaɪz/", pos: "noun · verb", meaning: "sự ưu tiên", example: "The city must prioritize water as a public priority.", exampleVi: "Thành phố phải ưu tiên nước như một vấn đề ưu tiên công cộng." },
      { number: 78, word: "infrastructure (n)", speak: "infrastructure", phonetic: "/ˈɪnfrəstrʌktʃə(r)/", pos: "noun", meaning: "cơ sở hạ tầng", example: "Old water infrastructure needs repair.", exampleVi: "Cơ sở hạ tầng nước cũ cần được sửa chữa." },
      { number: 79, word: "facility (n)", speak: "facility", phonetic: "/fəˈsɪləti/", pos: "noun", meaning: "cơ sở vật chất", example: "The treatment facility serves the whole town.", exampleVi: "Cơ sở xử lí phục vụ toàn thị trấn." },
      { number: 80, word: "philosophy (n)", speak: "philosophy", phonetic: "/fəˈlɒsəfi/", pos: "noun", meaning: "triết lí, triết học", example: "The policy reflects a new management philosophy.", exampleVi: "Chính sách phản ánh một triết lí quản lí mới." },
      { number: 81, word: "demand (v, n)", speak: "demand", phonetic: "/dɪˈmɑːnd/", pos: "verb · noun", meaning: "yêu cầu, nhu cầu", example: "Rising populations demand more water.", exampleVi: "Dân số tăng đòi hỏi nhiều nước hơn." },
      { number: 82, word: "diminish (v)", speak: "diminish", phonetic: "/dɪˈmɪnɪʃ/", pos: "verb", meaning: "giảm, cắt giảm", example: "Better systems can diminish waste.", exampleVi: "Các hệ thống tốt hơn có thể cắt giảm sự lãng phí." },
      { number: 83, word: "efficient (a) = effective", speak: "efficient, effective", phonetic: "/ɪˈfɪʃnt/", pos: "adjective", meaning: "= effective", example: "Efficient irrigation is an effective solution.", exampleVi: "Tưới tiêu hiệu quả là một giải pháp hữu hiệu." },
      { number: 84, word: "criteria (n)", speak: "criteria", phonetic: "/kraɪˈtɪəriə/", pos: "noun", meaning: "tiêu chí đánh giá", example: "Projects must meet strict criteria.", exampleVi: "Các dự án phải đáp ứng các tiêu chí nghiêm ngặt." },
      { number: 85, word: "budget (n)", speak: "budget", phonetic: "/ˈbʌdʒɪt/", pos: "noun", meaning: "ngân sách, ngân quỹ", example: "The project exceeded its budget.", exampleVi: "Dự án đã vượt quá ngân sách." },
      { number: 86, word: "domestic (a) = household", speak: "domestic, household", phonetic: "/dəˈmestɪk/", pos: "adjective", meaning: "trong nhà, trong nước", example: "Domestic water use includes household needs.", exampleVi: "Sử dụng nước trong nhà bao gồm các nhu cầu hộ gia đình." },
      { number: 87, word: "phenomenon (n)", speak: "phenomenon", phonetic: "/fəˈnɒmɪnən/", pos: "noun", meaning: "hiện tượng", example: "Rapid urban growth is a global phenomenon.", exampleVi: "Đô thị hóa nhanh là một hiện tượng toàn cầu." },
      { number: 88, word: "standard (n)", speak: "standard", phonetic: "/ˈstændəd/", pos: "noun", meaning: "Tiêu chuẩn, chuẩn mực", example: "The water meets the required standard.", exampleVi: "Nguồn nước đáp ứng tiêu chuẩn bắt buộc." },
      { number: 89, word: "expand (v) → expansion (n)", speak: "expand, expansion", phonetic: "/ɪkˈspænd/ · /ɪkˈspænʃn/", pos: "verb · noun", meaning: "mở rộng", example: "The city will expand the network during its next expansion.", exampleVi: "Thành phố sẽ mở rộng mạng lưới trong đợt mở rộng tiếp theo." },
      { number: 90, word: "extend (v) → extension (n)", speak: "extend, extension", phonetic: "/ɪkˈstend/ · /ɪkˈstenʃn/", pos: "verb · noun", meaning: "mở rộng", example: "They plan to extend the pipe through an extension project.", exampleVi: "Họ dự định mở rộng đường ống qua một dự án nối dài." },
      { number: 91, word: "concern (v, n) → be concerned with = be related to", speak: "concern, be concerned with, be related to", phonetic: "/kənˈsɜːn/", pos: "verb · noun · phrase", meaning: "quan tâm; lo lắng; liên quan", example: "The report is concerned with issues related to water.", exampleVi: "Báo cáo liên quan đến các vấn đề về nước." }
    ],
    p3: [
      { number: 92, word: "approach (v, n)", speak: "approach", phonetic: "/əˈprəʊtʃ/", pos: "verb · noun", meaning: "tiếp cận, cách tiếp cận; phương pháp", example: "The researchers proposed a new approach.", exampleVi: "Các nhà nghiên cứu đề xuất một cách tiếp cận mới." },
      { number: 93, word: "propose (v) → proposal (n)", speak: "propose, proposal", phonetic: "/prəˈpəʊz/ · /prəˈpəʊzl/", pos: "verb · noun", meaning: "đề xuất", example: "They propose a method in their proposal.", exampleVi: "Họ đề xuất một phương pháp trong bản đề xuất." },
      { number: 94, word: "conscious (a) of sb/st → consciousness (n)", speak: "conscious of, consciousness", phonetic: "/ˈkɒnʃəs/ · /ˈkɒnʃəsnəs/", pos: "adjective · noun", meaning: "nhận thức về ai / cái gì", example: "Learners are not always conscious of the process.", exampleVi: "Người học không phải lúc nào cũng nhận thức được quá trình này." },
      { number: 95, word: "technique (n) · technical (a)", speak: "technique, technical", phonetic: "/tekˈniːk/ · /ˈteknɪkl/", pos: "noun · adjective", meaning: "kĩ thuật", example: "The technique requires technical knowledge.", exampleVi: "Kĩ thuật này đòi hỏi kiến thức chuyên môn." },
      { number: 96, word: "curriculum (n)", speak: "curriculum", phonetic: "/kəˈrɪkjələm/", pos: "noun", meaning: "chương trình học", example: "The method was added to the curriculum.", exampleVi: "Phương pháp được thêm vào chương trình học." },
      { number: 97, word: "stimulate (v)", speak: "stimulate", phonetic: "/ˈstɪmjuleɪt/", pos: "verb", meaning: "kích thích", example: "Music may stimulate memory.", exampleVi: "Âm nhạc có thể kích thích trí nhớ." },
      { number: 98, word: "recall (v)", speak: "recall", phonetic: "/rɪˈkɔːl/", pos: "verb", meaning: "gợi lại kí ức", example: "Students could recall the information later.", exampleVi: "Học sinh có thể gợi lại thông tin sau đó." },
      { number: 99, word: "assume (v) = suppose", speak: "assume, suppose", phonetic: "/əˈsjuːm/", pos: "verb", meaning: "cho rằng, cho là...", example: "Researchers assume that relaxation helps learning.", exampleVi: "Các nhà nghiên cứu cho rằng thư giãn giúp việc học." },
      { number: 100, word: "attempt (v, n) = effort → make an attempt / effort", speak: "attempt, effort, make an attempt, make an effort", phonetic: "/əˈtempt/ · /ˈefət/", pos: "verb · noun · phrase", meaning: "nỗ lực, cố gắng", example: "Make an effort rather than a hurried attempt.", exampleVi: "Hãy nỗ lực thay vì thực hiện một lần thử vội vàng." },
      { number: 101, word: "effortless (a) = easy", speak: "effortless, easy", phonetic: "/ˈefətləs/", pos: "adjective", meaning: "ko cần nỗ lực, dễ dàng", example: "The technique makes recall feel effortless.", exampleVi: "Kĩ thuật khiến việc gợi nhớ trở nên dễ dàng." },
      { number: 102, word: "accomplish (v) = achieve", speak: "accomplish, achieve", phonetic: "/əˈkʌmplɪʃ/", pos: "verb", meaning: "đạt được thành tựu", example: "The method helps learners accomplish more.", exampleVi: "Phương pháp giúp người học đạt được nhiều thành tựu hơn." },
      { number: 103, word: "acknowledge (v)", speak: "acknowledge", phonetic: "/əkˈnɒlɪdʒ/", pos: "verb", meaning: "công nhận", example: "Critics acknowledge the method's influence.", exampleVi: "Các nhà phê bình công nhận ảnh hưởng của phương pháp." },
      { number: 104, word: "attribute a to b = put a down to b", speak: "attribute A to B, put A down to B", phonetic: "/əˈtrɪbjuːt/", pos: "phrase", meaning: "quy cho a là tại b", example: "They attribute the result to music.", exampleVi: "Họ quy kết quả đó là do âm nhạc." },
      { number: 105, word: "illustrate (v)", speak: "illustrate", phonetic: "/ˈɪləstreɪt/", pos: "verb", meaning: "minh họa, chứng minh", example: "The experiment illustrates the main principle.", exampleVi: "Thí nghiệm minh họa nguyên lí chính." },
      { number: 106, word: "procedure (n)", speak: "procedure", phonetic: "/prəˈsiːdʒə(r)/", pos: "noun", meaning: "tiến trình", example: "Students follow the same procedure.", exampleVi: "Học sinh làm theo cùng một tiến trình." },
      { number: 107, word: "hypnosis (n)", speak: "hypnosis", phonetic: "/hɪpˈnəʊsɪs/", pos: "noun", meaning: "thôi miên", example: "The technique is not a form of hypnosis.", exampleVi: "Kĩ thuật này không phải một hình thức thôi miên." },
      { number: 108, word: "valid (a)", speak: "valid", phonetic: "/ˈvælɪd/", pos: "adjective", meaning: "hợp lệ", example: "The researchers asked whether the claim was valid.", exampleVi: "Các nhà nghiên cứu đặt câu hỏi liệu tuyên bố có hợp lệ không." },
      { number: 109, word: "prior to sb/st = before → priority (n)", speak: "prior to, before, priority", phonetic: "/ˈpraɪə(r) tə/ · /praɪˈɒrəti/", pos: "phrase · noun", meaning: "sự ưu tiên", example: "Prior to the lesson, preparation is a priority.", exampleVi: "Trước buổi học, sự chuẩn bị là một ưu tiên." },
      { number: 110, word: "conventional (a) = traditional", speak: "conventional, traditional", phonetic: "/kənˈvenʃənl/", pos: "adjective", meaning: "= traditional", example: "The approach differs from conventional teaching.", exampleVi: "Cách tiếp cận khác với phương pháp dạy truyền thống." },
      { number: 111, word: "shift (v, n) = change", speak: "shift, change", phonetic: "/ʃɪft/", pos: "verb · noun", meaning: "chuyển dịch, thay đổi", example: "The method caused a shift in classroom practice.", exampleVi: "Phương pháp tạo ra một sự thay đổi trong thực hành lớp học." }
    ]
  };

  var PASSAGES = [
    {
      id: 1,
      title: "LET’S GO BATS",
      start: 1,
      end: 13,
      instruction: "Questions 1–13 are based on Reading Passage 1.",
      paragraphs: [
        { label: "A", text: "Bats have a problem: how to find their way around in the dark. They hunt at night, and cannot use light to help them find prey and avoid obstacles. You might say that this is a problem of their own making, one that they could avoid simply by changing their habits and hunting by day. But the daytime economy is already heavily exploited by other creatures such as birds. Given that there is a living to be made at night, and given that alternative daytime trades are thoroughly occupied, natural selection has favoured bats that make a go of the night-hunting trade. It is probable that the nocturnal trades go way back in the ancestry of all mammals. In the time when the dinosaurs dominated the daytime economy, our mammalian ancestors probably only managed to survive at all because they found ways of scraping a living at night. Only after the mysterious mass extinction of the dinosaurs about 65 million years ago were our ancestors able to emerge into the daylight in any substantial numbers." },
        { label: "B", text: "Bats have an engineering problem: how to find their way and find their prey in the absence of light. Bats are not the only creatures to face this difficulty today. Obviously the night-flying insects that they prey on must find their way about somehow. Deep-sea fish and whales have little or no light by day or by night. Fish and dolphins that live in extremely muddy water cannot see because, although there is light, it is obstructed and scattered by the dirt in the water. Plenty of other modern animals make their living in conditions where seeing is difficult or impossible." },
        { label: "C", text: "Given the questions of how to manoeuvre in the dark, what solutions might an engineer consider? The first one that might occur to him is to manufacture light, to use a lantern or a searchlight. Fireflies and some fish (usually with the help of bacteria) have the power to manufacture their own light, but the process seems to consume a large amount of energy. Fireflies use their light for attracting mates. This doesn’t require a prohibitive amount of energy: a male’s tiny pinprick of light can be seen by a female from some distance on a dark night, since her eyes are exposed directly to the light source itself. However, using light to find one’s own way around requires vastly more energy, since the eyes have to detect the tiny fraction of the light that bounces off each part of the scene. The light source must therefore be immensely brighter if it is to be used as a headlight to illuminate the path, than if it is to be used as a signal to others. In any event, whether or not the reason is the energy expense, it seems to be the case that, with the possible exception of some weird deep-sea fish, no animal apart from man uses manufactured light to find its way about." },
        { label: "D", text: "What else might the engineer think of? Well, blind humans sometimes seem to have an uncanny sense of obstacles in their path. It has been given the name ‘facial vision’, because blind people have reported that it feels a bit like the sense of touch, on the face. One report tells of a totally blind boy who could ride his tricycle at good speed round the block near his home, using facial vision. Experiments showed that, in fact, facial vision is nothing to do with touch or the front of the face, although the sensation may be referred to the front of the face, like the referred pain in a phantom limb. The sensation of facial vision, it turns out, really goes in through the ears. Blind people, without even being aware of the fact, are actually using echoes of their own footsteps and of other sounds, to sense the presence of obstacles. Before this was discovered, engineers had already built instruments to exploit the principle, for example to measure the depth of the sea under a ship. After this technique had been invented, it was only a matter of time before weapons designers adapted it for the detection of submarines. Both sides in the Second World War relied heavily on these devices, under such codenames as Asdic (British) and Sonar (American), as well as Radar (American) or RDF (British), which uses radio echoes rather than sound echoes." },
        { label: "E", text: "The Sonar and Radar pioneers didn’t know it then, but all the world now knows that bats, or rather natural selection working on bats, had perfected the system tens of millions of years earlier, and their ‘radar’ achieves feats of detection and navigation that would strike an engineer dumb with admiration. It is technically incorrect to talk about bat ‘radar’, since they do not use radio waves. It is sonar. But the underlying mathematical theories of radar and sonar are very similar; and much of our scientific understanding of the details of what bats are doing has come from applying radar theory to them. The American zoologist Donald Griffin, who was largely responsible for the discovery of sonar in bats, coined the term ‘echolocation’ to cover both sonar and radar, whether used by animals or by human instruments." }
      ]
    },
    {
      id: 2,
      title: "MAKING EVERY DROP COUNT",
      start: 14,
      end: 26,
      instruction: "Questions 14–26 are based on Reading Passage 2.",
      paragraphs: [
        { label: "A", text: "The history of human civilisation is entwined with the history of the ways we have learned to manipulate water resources. As towns gradually expanded, water was brought from increasingly remote sources, leading to sophisticated engineering efforts such as dams and aqueducts. At the height of the Roman Empire, nine major systems, with an innovative layout of pipes and well-built sewers, supplied the occupants of Rome with as much water per person as is provided in many parts of the industrial world today." },
        { label: "B", text: "During the industrial revolution and population explosion of the 19th and 20th centuries, the demand for water rose dramatically. Unprecedented construction of tens of thousands of monumental engineering projects designed to control floods, protect clean water supplies, and provide water for irrigation and hydropower brought great benefits to hundreds of millions of people. Food production has kept pace with soaring populations mainly because of the expansion of artificial irrigation systems that make possible the growth of 40% of the world’s food. Nearly one fifth of all the electricity generated worldwide is produced by turbines spun by the power of falling water." },
        { label: "C", text: "Yet there is a dark side to this picture: despite our progress, half of the world’s population still suffers, with water services inferior to those available to the ancient Greeks and Romans. As the United Nations report on access to water reiterated in November 2001, more than one billion people lack access to clean drinking water; some two and a half billion do not have adequate sanitation services. Preventable water-related diseases kill an estimated 10,000 to 20,000 children every day, and the latest evidence suggests that we are falling behind in efforts to solve these problems." },
        { label: "D", text: "The consequences of our water policies extend beyond jeopardising human health. Tens of millions of people have been forced to move from their homes – often with little warning or compensation – to make way for the reservoirs behind dams. More than 20% of all freshwater fish species are now threatened or endangered because dams and water withdrawals have destroyed the free-flowing river ecosystems where they thrive. Certain irrigation practices degrade soil quality and reduce agricultural productivity. Groundwater aquifers are being pumped down faster than they are naturally replenished in parts of India, China, the USA and elsewhere. And disputes over shared water resources have led to violence and continue to raise local, national and even international tensions." },
        { label: "E", text: "At the outset of the new millennium, however, the way resource planners think about water is beginning to change. The focus is slowly shifting back to the provision of basic human and environmental needs as top priority – ensuring ‘some for all,’ instead of ‘more for some’. Some water experts are now demanding that existing infrastructure be used in smarter ways rather than building new facilities, which is increasingly considered the option of last, not first, resort. This shift in philosophy has not been universally accepted, and it comes with strong opposition from some established water organisations. Nevertheless, it may be the only way to address successfully the pressing problems of providing everyone with clean water to drink, adequate water to grow food and a life free from preventable water-related illness." },
        { label: "F", text: "Fortunately – and unexpectedly – the demand for water is not rising as rapidly as some predicted. As a result, the pressure to build new water infrastructures has diminished over the past two decades. Although population, industrial output and economic productivity have continued to soar in developed nations, the rate at which people withdraw water from aquifers, rivers and lakes has slowed. And in a few parts of the world, demand has actually fallen." },
        { label: "G", text: "What explains this remarkable turn of events? Two factors: people have figured out how to use water more efficiently, and communities are rethinking their priorities for water use. Throughout the first three-quarters of the 20th century, the quantity of freshwater consumed per person doubled on average; in the USA, water withdrawals increased tenfold while the population quadrupled. But since 1980, the amount of water consumed per person has actually decreased, thanks to a range of new technologies that help to conserve water in homes and industry. In 1965, for instance, Japan used approximately 13 million gallons of water to produce $1 million of commercial output; by 1989 this had dropped to 3.5 million gallons (even accounting for inflation) – almost a quadrupling of water productivity. In the USA, water withdrawals have fallen by more than 20% from their peak in 1980." },
        { label: "H", text: "On the other hand, dams, aqueducts and other kinds of infrastructure will still have to be built, particularly in developing countries where basic human needs have not been met. But such projects must be built to higher specifications and with more accountability to local people and their environment than in the past. And even in regions where new projects seem warranted, we must find ways to meet demands with fewer resources, respecting ecological criteria and to a smaller budget." }
      ],
      footnote: "aquifer: an underground store of water · 1 gallon: 4.546 litres"
    },
    {
      id: 3,
      title: "EDUCATING PSYCHE",
      start: 27,
      end: 40,
      instruction: "Questions 27–40 are based on Reading Passage 3.",
      paragraphs: [
        { label: "1", text: "Educating Psyche by Bernie Neville is a book which looks at radical new approaches to learning, describing the effects of emotion, imagination and the unconscious on learning. One theory discussed in the book is that proposed by George Lozanov, which focuses on the power of suggestion." },
        { label: "2", text: "Lozanov’s instructional technique is based on the evidence that the connections made in the brain through unconscious processing (which he calls non-specific mental reactivity) are more durable than those made through conscious processing. Besides the laboratory evidence for this, we know from our experience that we often remember what we have perceived peripherally, long after we have forgotten what we set out to learn. If we think of a book we studied months or years ago, we will find it easier to recall peripheral details – the colour, the binding, the typeface, the table at the library where we sat while studying it – than the content on which we were concentrating. If we think of a lecture we listened to with great concentration, we will recall the lecturer’s appearance and mannerisms, our place in the auditorium, the failure of the air-conditioning, much more easily than the ideas we went to learn. Even if these peripheral details are a bit elusive, they come back readily in hypnosis or when we relive the event imaginatively, as in psychodrama. The details of the content of the lecture, on the other hand, seem to have gone forever." },
        { label: "3", text: "This phenomenon can be partly attributed to the common counterproductive approach to study (making extreme efforts to memorise, tensing muscles, inducing fatigue), but it also simply reflects the way the brain functions. Lozanov therefore made indirect instruction (suggestion) central to his teaching system. In suggestopedia, as he called his method, consciousness is shifted away from the curriculum to focus on something peripheral. The curriculum then becomes peripheral and is dealt with by the reserve capacity of the brain." },
        { label: "4", text: "The suggestopedic approach to foreign language learning provides a good illustration. In its most recent variant (1980), it consists of the reading of vocabulary and text while the class is listening to music. The first session is in two parts. In the first part, the music is classical (Mozart, Beethoven, Brahms) and the teacher reads the text slowly and solemnly, with attention to the dynamics of the music. The students follow the text in their books. This is followed by several minutes of silence. In the second part, they listen to baroque music (Bach, Corelli, Handel) while the teacher reads the text in a normal speaking voice. During this time they have their books closed. During the whole of this session, their attention is passive; they listen to the music but make no attempt to learn the material." },
        { label: "5", text: "Beforehand, the students have been carefully prepared for the language learning experience. Through meeting with the staff and satisfied students they develop the expectation that learning will be easy and pleasant and that they will successfully learn several hundred words of the foreign language during the class. In a preliminary talk, the teacher introduces them to the material to be covered, but does not ‘teach’ it. Likewise, the students are instructed not to try to learn it during this introduction." },
        { label: "6", text: "Some hours after the two-part session, there is a follow-up class at which the students are stimulated to recall the material presented. Once again the approach is indirect. The students do not focus their attention on trying to remember the vocabulary, but focus on using the language to communicate (e.g. through games or improvised dramatisations). Such methods are not unusual in language teaching. What is distinctive in the suggestopedic method is that they are devoted entirely to assisting recall. The ‘learning’ of the material is assumed to be automatic and effortless, accomplished while listening to music. The teacher’s task is to assist the students to apply what they have learned paraconsciously, and in doing so to make it easily accessible to consciousness. Another difference from conventional teaching is the evidence that students can regularly learn 1000 new words of a foreign language during a suggestopedic session, as well as grammar and idiom." },
        { label: "7", text: "Lozanov experimented with teaching by direct suggestion during sleep, hypnosis and trance states, but found such procedures unnecessary. Hypnosis, yoga, Silva mind-control, religious ceremonies and faith healing are all associated with successful suggestion, but none of their techniques seem to be essential to it. Such rituals may be seen as placebos. Lozanov acknowledges that the ritual surrounding suggestion in his own system is also a placebo, but maintains that without such a placebo people are unable or afraid to tap the reserve capacity of their brains. Like any placebo, it must be dispensed with authority to be effective. Just as a doctor calls on the full power of autocratic suggestion by insisting that the patient take precisely this white capsule precisely three times a day before meals, Lozanov is categoric in insisting that the suggestopedic session be conducted exactly in the manner designated, by trained and accredited suggestopedic teachers." },
        { label: "8", text: "While suggestopedia has gained some notoriety through success in the teaching of modern languages, few teachers are able to emulate the spectacular results of Lozanov and his associates. We can, perhaps, attribute mediocre results to an inadequate placebo effect. The students have not developed the appropriate mind set. They are often not motivated to learn through this method. They do not have enough ‘faith’. They do not see it as ‘real teaching’, especially as it does not seem to involve the ‘work’ they have learned to believe is essential to learning." }
      ]
    }
  ];

  var PARAGRAPH_OPTIONS = ["A", "B", "C", "D", "E"];
  var TRUE_FALSE_OPTIONS = ["TRUE", "FALSE", "NOT GIVEN"];
  var YES_NO_OPTIONS = ["YES", "NO", "NOT GIVEN"];
  var HEADING_OPTIONS = [
    { value: "I", label: "i — Scientists’ call for a revision of policy" },
    { value: "II", label: "ii — An explanation for reduced water use" },
    { value: "III", label: "iii — How a global challenge was met" },
    { value: "IV", label: "iv — Irrigation systems fall into disuse" },
    { value: "V", label: "v — Environmental effects" },
    { value: "VI", label: "vi — The financial cost of recent technological improvements" },
    { value: "VII", label: "vii — The relevance to health" },
    { value: "VIII", label: "viii — Addressing the concern over increasing populations" },
    { value: "IX", label: "ix — A surprising downward trend in demand for water" },
    { value: "X", label: "x — The need to raise standards" },
    { value: "XI", label: "xi — A description of ancient water supplies" }
  ];
  var SUMMARY_WORD_OPTIONS = [
    { value: "A", label: "A — spectacular" },
    { value: "B", label: "B — teaching" },
    { value: "C", label: "C — lesson" },
    { value: "D", label: "D — authoritarian" },
    { value: "E", label: "E — unpopular" },
    { value: "F", label: "F — ritual" },
    { value: "G", label: "G — unspectacular" },
    { value: "H", label: "H — placebo" },
    { value: "I", label: "I — involved" },
    { value: "J", label: "J — appropriate" },
    { value: "K", label: "K — well known" }
  ];

  var QUESTION_GROUPS = {
    1: [
      {
        title: "Questions 1–5",
        instruction: "Reading Passage 1 has five paragraphs, A–E. Which paragraph contains the following information? You may use any letter more than once.",
        questions: [
          { n: 1, type: "select", text: "examples of wildlife other than bats which do not rely on vision to navigate by", options: PARAGRAPH_OPTIONS },
          { n: 2, type: "select", text: "how early mammals avoided dying out", options: PARAGRAPH_OPTIONS },
          { n: 3, type: "select", text: "why bats hunt in the dark", options: PARAGRAPH_OPTIONS },
          { n: 4, type: "select", text: "how a particular discovery has helped our understanding of bats", options: PARAGRAPH_OPTIONS },
          { n: 5, type: "select", text: "early military uses of echolocation", options: PARAGRAPH_OPTIONS }
        ]
      },
      {
        title: "Questions 6–9",
        instruction: "Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.",
        lead: "<div class=\"summary-box\"><b>Facial Vision</b><br>Blind people report that so-called ‘facial vision’ is comparable to the sensation of touch on the face. In fact, the sensation is more similar to referred pain in a missing arm or leg. The ability comes from sound perceived through the ears. The principle was later used to calculate the seabed and for a wartime detection system.</div>",
        questions: [
          { n: 6, type: "text", text: "Pain from a ______ arm or leg might be felt." },
          { n: 7, type: "text", text: "The ability actually comes from perceiving ______ through the ears." },
          { n: 8, type: "text", text: "Instruments calculated the ______ of the seabed." },
          { n: 9, type: "text", text: "Wartime devices were used for finding ______." }
        ]
      },
      {
        title: "Questions 10–13",
        instruction: "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
        questions: [
          { n: 10, type: "text", text: "Long before the invention of radar, ______ had resulted in a sophisticated radar-like system in bats." },
          { n: 11, type: "text", text: "Radar is an inaccurate term when referring to bats because ______ are not used in their navigation system." },
          { n: 12, type: "text", text: "Radar and sonar are based on similar ______." },
          { n: 13, type: "text", text: "The word ‘echolocation’ was first used by someone working as a ______." }
        ]
      }
    ],
    2: [
      {
        title: "Questions 14–20",
        instruction: "Choose the correct heading for paragraphs A and C–H from the list of headings below. Write the correct number, i–xi.",
        bankTitle: "List of Headings",
        bank: HEADING_OPTIONS,
        example: "Example: Paragraph B — iii",
        questions: [
          { n: 14, type: "select", text: "Paragraph A", options: HEADING_OPTIONS },
          { n: 15, type: "select", text: "Paragraph C", options: HEADING_OPTIONS },
          { n: 16, type: "select", text: "Paragraph D", options: HEADING_OPTIONS },
          { n: 17, type: "select", text: "Paragraph E", options: HEADING_OPTIONS },
          { n: 18, type: "select", text: "Paragraph F", options: HEADING_OPTIONS },
          { n: 19, type: "select", text: "Paragraph G", options: HEADING_OPTIONS },
          { n: 20, type: "select", text: "Paragraph H", options: HEADING_OPTIONS }
        ]
      },
      {
        title: "Questions 21–26",
        instruction: "Do the following statements agree with the claims of the writer? Choose YES, NO or NOT GIVEN.",
        questions: [
          { n: 21, type: "radio", text: "Water use per person is higher in the industrial world than it was in Ancient Rome.", options: YES_NO_OPTIONS },
          { n: 22, type: "radio", text: "Feeding increasing populations is possible due primarily to improved irrigation systems.", options: YES_NO_OPTIONS },
          { n: 23, type: "radio", text: "Modern water systems imitate those of the ancient Greeks and Romans.", options: YES_NO_OPTIONS },
          { n: 24, type: "radio", text: "Industrial growth is increasing the overall demand for water.", options: YES_NO_OPTIONS },
          { n: 25, type: "radio", text: "Modern technologies have led to a reduction in domestic water consumption.", options: YES_NO_OPTIONS },
          { n: 26, type: "radio", text: "In the future, governments should maintain ownership of water infrastructures.", options: YES_NO_OPTIONS }
        ]
      }
    ],
    3: [
      {
        title: "Questions 27–30",
        instruction: "Choose the correct letter, A, B, C or D.",
        questions: [
          { n: 27, type: "radio", text: "The book Educating Psyche is mainly concerned with", options: [
            { value: "A", label: "A — the power of suggestion in learning." },
            { value: "B", label: "B — a particular technique for learning based on emotions." },
            { value: "C", label: "C — the effects of emotion on the imagination and the unconscious." },
            { value: "D", label: "D — ways of learning which are not traditional." }
          ] },
          { n: 28, type: "radio", text: "Lozanov’s theory claims that, when we try to remember things,", options: [
            { value: "A", label: "A — unimportant details are the easiest to recall." },
            { value: "B", label: "B — concentrating hard produces the best results." },
            { value: "C", label: "C — the most significant facts are most easily recalled." },
            { value: "D", label: "D — peripheral vision is not important." }
          ] },
          { n: 29, type: "radio", text: "In this passage, the author uses the examples of a book and a lecture to illustrate that", options: [
            { value: "A", label: "A — both of these are important for developing concentration." },
            { value: "B", label: "B — his theory about methods of learning is valid." },
            { value: "C", label: "C — reading is a better technique for learning than listening." },
            { value: "D", label: "D — we can remember things more easily under hypnosis." }
          ] },
          { n: 30, type: "radio", text: "Lozanov claims that teachers should train students to", options: [
            { value: "A", label: "A — memorise details of the curriculum." },
            { value: "B", label: "B — develop their own sets of indirect instructions." },
            { value: "C", label: "C — think about something other than the curriculum content." },
            { value: "D", label: "D — avoid overloading the capacity of the brain." }
          ] }
        ]
      },
      {
        title: "Questions 31–36",
        instruction: "Do the following statements agree with the information given in Reading Passage 3? Choose TRUE, FALSE or NOT GIVEN.",
        questions: [
          { n: 31, type: "radio", text: "In the example of suggestopedic teaching in the fourth paragraph, the only variable that changes is the music.", options: TRUE_FALSE_OPTIONS },
          { n: 32, type: "radio", text: "Prior to the suggestopedia class, students are made aware that the language experience will be demanding.", options: TRUE_FALSE_OPTIONS },
          { n: 33, type: "radio", text: "In the follow-up class, the teaching activities are similar to those used in conventional classes.", options: TRUE_FALSE_OPTIONS },
          { n: 34, type: "radio", text: "As an indirect benefit, students notice improvements in their memory.", options: TRUE_FALSE_OPTIONS },
          { n: 35, type: "radio", text: "Teachers say they prefer suggestopedia to traditional approaches to language teaching.", options: TRUE_FALSE_OPTIONS },
          { n: 36, type: "radio", text: "Students in a suggestopedia class retain more new vocabulary than those in ordinary classes.", options: TRUE_FALSE_OPTIONS }
        ]
      },
      {
        title: "Questions 37–40",
        instruction: "Complete the summary using the list of words, A–K, below. Write the correct letter, A–K.",
        bankTitle: "Word List",
        bank: SUMMARY_WORD_OPTIONS,
        lead: "<div class=\"summary-box\">Suggestopedia uses a less direct method of suggestion than techniques such as hypnosis. Lozanov admits that a certain amount of <b>37 ______</b> is necessary, even if this is just a <b>38 ______</b>. Although the method has become quite <b>39 ______</b>, the results of most other teachers have been <b>40 ______</b>.</div>",
        questions: [
          { n: 37, type: "select", text: "Blank 37", options: SUMMARY_WORD_OPTIONS },
          { n: 38, type: "select", text: "Blank 38", options: SUMMARY_WORD_OPTIONS },
          { n: 39, type: "select", text: "Blank 39", options: SUMMARY_WORD_OPTIONS },
          { n: 40, type: "select", text: "Blank 40", options: SUMMARY_WORD_OPTIONS }
        ]
      }
    ]
  };

  var currentVocabSet = "p2";
  var activeVocabIndex = 0;
  var speechSequence = 0;
  var activePassageId = 1;
  var examState = loadExamState();
  var vocabState = loadVocabState();

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normaliseAnswer(value) {
    return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
  }

  function loadExamState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && typeof parsed === "object") {
        parsed.answers = parsed.answers || {};
        parsed.highlights = parsed.highlights || {};
        return parsed;
      }
    } catch (error) {
      console.warn("Could not restore exam state", error);
    }
    return { started: false, submitted: false, answers: {}, highlights: {} };
  }

  function saveExamState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(examState));
    } catch (error) {
      console.warn("Could not save exam state", error);
    }
  }

  function loadVocabState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(VOCAB_KEY) || "null");
      if (parsed && parsed.p2 && parsed.p3) return parsed;
    } catch (error) {
      console.warn("Could not restore vocabulary state", error);
    }
    return { p2: [], p3: [] };
  }

  function saveVocabState() {
    localStorage.setItem(VOCAB_KEY, JSON.stringify(vocabState));
  }

  function openPanel(panelName, shouldScroll) {
    var buttons = document.querySelectorAll(".tab-button");
    var panels = document.querySelectorAll(".panel");
    buttons.forEach(function (button) {
      button.classList.toggle("active", button.getAttribute("data-tab") === panelName);
    });
    panels.forEach(function (panel) {
      var isActive = panel.getAttribute("data-panel") === panelName;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
    if (history.replaceState) history.replaceState(null, "", "#" + panelName);
    if (panelName === "test") restoreTestView();
    if (shouldScroll !== false) {
      var tabBar = document.querySelector(".tab-bar");
      if (tabBar && !document.body.classList.contains("exam-running")) {
        tabBar.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function initTabs() {
    document.querySelectorAll(".tab-button").forEach(function (button) {
      button.addEventListener("click", function () {
        openPanel(button.getAttribute("data-tab"));
      });
    });
    document.querySelectorAll("[data-open-tab]").forEach(function (button) {
      button.addEventListener("click", function () {
        openPanel(button.getAttribute("data-open-tab"));
      });
    });
    var requested = location.hash.replace("#", "");
    if (["workflow", "vocabulary", "homework", "test"].indexOf(requested) >= 0) {
      openPanel(requested, false);
    }
  }

  function initClassOptions() {
    var select = document.getElementById("studentClass");
    CLASS_OPTIONS.forEach(function (className) {
      var option = document.createElement("option");
      option.value = className;
      option.textContent = className;
      select.appendChild(option);
    });
    if (examState.identity) {
      document.getElementById("studentName").value = examState.identity.name || "";
      select.value = examState.identity.className || "";
    }
  }

  function renderVocab() {
    var words = VOCABULARY[currentVocabSet];
    if (activeVocabIndex >= words.length) activeVocabIndex = 0;
    var word = words[activeVocabIndex];
    document.getElementById("vocabIndex").textContent = String(word.number || activeVocabIndex + 1).padStart(2, "0");
    document.getElementById("vocabTotal").textContent = "/ " + words.length;
    document.getElementById("vocabTag").textContent = currentVocabSet === "p2" ? "PASSAGE 2" : "PASSAGE 3";
    document.getElementById("vocabWord").textContent = word.word;
    document.getElementById("vocabPhonetic").textContent = word.phonetic + " · " + word.pos;
    document.getElementById("vocabMeaning").textContent = word.meaning;
    document.getElementById("vocabExample").textContent = word.example;
    document.getElementById("vocabExampleMeaning").textContent = word.exampleVi || "";

    var mastered = vocabState[currentVocabSet] || [];
    document.getElementById("masteredCount").textContent = mastered.length + "/" + words.length;
    document.getElementById("vocabGrid").innerHTML = words.map(function (item, index) {
      var isMastered = mastered.indexOf(index) >= 0;
      return "<button type=\"button\" class=\"vocab-card" +
        (index === activeVocabIndex ? " active" : "") +
        (isMastered ? " mastered" : "") +
        "\" data-vocab-index=\"" + index + "\">" +
        "<span class=\"vocab-number\">" + String(item.number || index + 1).padStart(2, "0") + "</span>" +
        "<span><b>" + escapeHtml(item.word) + "</b><small>" + escapeHtml(item.meaning) + "</small></span>" +
        "<span class=\"master-toggle\" data-master-index=\"" + index + "\" title=\"Đánh dấu đã thuộc\">✓</span>" +
        "</button>";
    }).join("");
  }

  function toggleMastered(index) {
    var list = vocabState[currentVocabSet] || [];
    var position = list.indexOf(index);
    if (position >= 0) list.splice(position, 1);
    else list.push(index);
    list.sort(function (a, b) { return a - b; });
    vocabState[currentVocabSet] = list;
    saveVocabState();
    renderVocab();
  }

  function speakWordAndExample(item, onEnd) {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    var wordUtterance = new SpeechSynthesisUtterance(item.speak || item.word);
    var exampleUtterance = new SpeechSynthesisUtterance(item.example);
    wordUtterance.lang = exampleUtterance.lang = "en-GB";
    wordUtterance.rate = 0.78;
    exampleUtterance.rate = 0.86;
    var voices = window.speechSynthesis.getVoices();
    var preferred = voices.find(function (voice) { return /^en-GB/i.test(voice.lang); }) ||
      voices.find(function (voice) { return /^en/i.test(voice.lang); });
    if (preferred) {
      wordUtterance.voice = preferred;
      exampleUtterance.voice = preferred;
    }
    wordUtterance.onend = function () {
      window.setTimeout(function () { window.speechSynthesis.speak(exampleUtterance); }, 260);
    };
    if (onEnd) exampleUtterance.onend = onEnd;
    window.speechSynthesis.speak(wordUtterance);
  }

  function playVocabSequence(index, sequenceId) {
    var words = VOCABULARY[currentVocabSet];
    if (sequenceId !== speechSequence || index >= words.length) return;
    activeVocabIndex = index;
    renderVocab();
    speakWordAndExample(words[index], function () {
      window.setTimeout(function () { playVocabSequence(index + 1, sequenceId); }, 320);
    });
  }

  function initVocabulary() {
    document.querySelectorAll(".vocab-switch-button").forEach(function (button) {
      button.addEventListener("click", function () {
        speechSequence += 1;
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        currentVocabSet = button.getAttribute("data-vocab-set");
        activeVocabIndex = 0;
        document.querySelectorAll(".vocab-switch-button").forEach(function (item) {
          item.classList.toggle("active", item === button);
        });
        renderVocab();
      });
    });
    document.getElementById("vocabGrid").addEventListener("click", function (event) {
      var master = event.target.closest("[data-master-index]");
      if (master) {
        event.stopPropagation();
        toggleMastered(Number(master.getAttribute("data-master-index")));
        return;
      }
      var card = event.target.closest("[data-vocab-index]");
      if (!card) return;
      activeVocabIndex = Number(card.getAttribute("data-vocab-index"));
      renderVocab();
      speechSequence += 1;
      speakWordAndExample(VOCABULARY[currentVocabSet][activeVocabIndex]);
    });
    document.getElementById("speakWord").addEventListener("click", function () {
      speechSequence += 1;
      speakWordAndExample(VOCABULARY[currentVocabSet][activeVocabIndex]);
    });
    document.getElementById("playAllWords").addEventListener("click", function () {
      speechSequence += 1;
      playVocabSequence(0, speechSequence);
    });
    document.getElementById("stopWords").addEventListener("click", function () {
      speechSequence += 1;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    });
    document.getElementById("resetVocab").addEventListener("click", function () {
      speechSequence += 1;
      vocabState[currentVocabSet] = [];
      saveVocabState();
      renderVocab();
    });
    renderVocab();
  }

  function optionValue(option) {
    return typeof option === "string" ? option : option.value;
  }

  function optionLabel(option) {
    return typeof option === "string" ? option : option.label;
  }

  function renderQuestion(question) {
    var saved = examState.answers[String(question.n)] || "";
    var control = "";
    if (question.type === "text") {
      control = "<input class=\"q-input\" type=\"text\" autocomplete=\"off\" spellcheck=\"false\" data-question-control data-q=\"" +
        question.n + "\" value=\"" + escapeHtml(saved) + "\" aria-label=\"Answer " + question.n + "\">";
    } else if (question.type === "select") {
      control = "<select class=\"q-select\" data-question-control data-q=\"" + question.n + "\" aria-label=\"Answer " + question.n + "\">" +
        "<option value=\"\">Choose an answer</option>" +
        question.options.map(function (option) {
          var value = optionValue(option);
          return "<option value=\"" + escapeHtml(value) + "\"" + (saved === value ? " selected" : "") + ">" +
            escapeHtml(optionLabel(option)) + "</option>";
        }).join("") + "</select>";
    } else {
      control = "<div class=\"option-list\">" + question.options.map(function (option) {
        var value = optionValue(option);
        return "<label><input type=\"radio\" name=\"q" + question.n + "\" data-question-control data-q=\"" +
          question.n + "\" value=\"" + escapeHtml(value) + "\"" + (saved === value ? " checked" : "") + "> " +
          "<span>" + escapeHtml(optionLabel(option)) + "</span></label>";
      }).join("") + "</div>";
    }
    return "<article class=\"question\" id=\"question-" + question.n + "\" data-question=\"" + question.n + "\">" +
      "<div class=\"question-row\"><span class=\"q-num\">" + question.n + "</span><div class=\"q-body\">" +
      "<p>" + escapeHtml(question.text) + "</p>" + control + "</div></div></article>";
  }

  function renderQuestionGroup(group) {
    var bank = "";
    if (group.bank) {
      bank = "<div class=\"" + (group.bankTitle === "Word List" ? "word-bank-test" : "heading-bank-test") + "\">" +
        "<b>" + escapeHtml(group.bankTitle || "Options") + "</b>" +
        group.bank.map(function (option) {
          return "<span>" + escapeHtml(optionLabel(option)) + "</span>";
        }).join("") + "</div>";
    }
    return "<section class=\"question-group\"><h2>" + escapeHtml(group.title) + "</h2>" +
      "<p class=\"group-instruction\">" + escapeHtml(group.instruction) + "</p>" +
      (group.example ? "<p class=\"example-answer\">" + escapeHtml(group.example) + "</p>" : "") +
      bank + (group.lead || "") + group.questions.map(renderQuestion).join("") + "</section>";
  }

  function renderPassage(passageId, scrollToQuestion) {
    activePassageId = passageId;
    var passage = PASSAGES[passageId - 1];
    document.querySelectorAll(".passage-tab").forEach(function (button) {
      button.classList.toggle("active", Number(button.getAttribute("data-passage")) === passageId);
    });
    var readingHtml = "<h1>" + escapeHtml(passage.title) + "</h1>" +
      "<p class=\"passage-instruction\">" + escapeHtml(passage.instruction) + "</p>" +
      passage.paragraphs.map(function (paragraph) {
        return "<p class=\"passage-paragraph\"><span class=\"para-label\">" + escapeHtml(paragraph.label) +
          "</span>" + escapeHtml(paragraph.text) + "</p>";
      }).join("");
    if (passage.footnote) {
      readingHtml += "<p class=\"passage-instruction\">" + escapeHtml(passage.footnote) + "</p>";
    }
    var savedReading = examState.highlights && examState.highlights[String(passageId)];
    document.getElementById("readingPane").innerHTML = savedReading || readingHtml;
    document.getElementById("questionPane").innerHTML = QUESTION_GROUPS[passageId].map(renderQuestionGroup).join("");
    document.getElementById("readingPane").scrollTop = 0;
    document.getElementById("questionPane").scrollTop = 0;
    updatePalette();
    if (scrollToQuestion) {
      window.requestAnimationFrame(function () {
        var target = document.getElementById("question-" + scrollToQuestion);
        if (target) target.scrollIntoView({ block: "center" });
      });
    }
  }

  function renderExamChrome() {
    document.getElementById("passageTabs").innerHTML = PASSAGES.map(function (passage) {
      return "<button type=\"button\" class=\"passage-tab" + (passage.id === activePassageId ? " active" : "") +
        "\" data-passage=\"" + passage.id + "\">Passage " + passage.id +
        "<small>Questions " + passage.start + "–" + passage.end + "</small></button>";
    }).join("");
    document.getElementById("questionPalette").innerHTML = Array.from({ length: 40 }, function (_, index) {
      var number = index + 1;
      return "<button type=\"button\" class=\"palette-button\" data-palette-q=\"" + number + "\">" + number + "</button>";
    }).join("");
    document.getElementById("candidateName").textContent = examState.identity ? examState.identity.name : "—";
    renderPassage(activePassageId);
  }

  function passageForQuestion(number) {
    return PASSAGES.find(function (passage) {
      return number >= passage.start && number <= passage.end;
    }) || PASSAGES[0];
  }

  function updatePalette() {
    document.querySelectorAll(".palette-button").forEach(function (button) {
      var number = Number(button.getAttribute("data-palette-q"));
      var value = normaliseAnswer(examState.answers[String(number)]);
      button.classList.toggle("answered", Boolean(value));
      button.classList.toggle("current", passageForQuestion(number).id === activePassageId);
    });
  }

  function readControlValue(control) {
    if (control.type === "radio") {
      var checked = document.querySelector("input[name=\"" + control.name + "\"]:checked");
      return checked ? checked.value : "";
    }
    return control.value;
  }

  function recordAnswer(control) {
    var number = control.getAttribute("data-q");
    if (!number) return;
    examState.answers[number] = readControlValue(control);
    saveExamState();
    updatePalette();
  }

  function saveReadingHighlights() {
    var readingPane = document.getElementById("readingPane");
    examState.highlights = examState.highlights || {};
    examState.highlights[String(activePassageId)] = readingPane.innerHTML;
    saveExamState();
  }

  function initReadingHighlighter() {
    var readingPane = document.getElementById("readingPane");
    readingPane.addEventListener("mouseup", function () {
      var selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      var range = selection.getRangeAt(0);
      if (!readingPane.contains(range.commonAncestorContainer)) return;

      var walker = document.createTreeWalker(readingPane, NodeFilter.SHOW_TEXT);
      var textNodes = [];
      var node;
      while ((node = walker.nextNode())) {
        if (!node.nodeValue.trim() || node.parentElement.closest("mark.reading-highlight")) continue;
        try {
          if (range.intersectsNode(node)) textNodes.push(node);
        } catch (error) {
          // Ignore nodes outside the active selection range.
        }
      }

      textNodes.reverse().forEach(function (textNode) {
        var start = textNode === range.startContainer ? range.startOffset : 0;
        var end = textNode === range.endContainer ? range.endOffset : textNode.nodeValue.length;
        if (end <= start) return;
        var piece = document.createRange();
        piece.setStart(textNode, start);
        piece.setEnd(textNode, end);
        var mark = document.createElement("mark");
        mark.className = "reading-highlight";
        mark.title = "Bấm để bỏ tô vàng";
        piece.surroundContents(mark);
      });

      selection.removeAllRanges();
      if (textNodes.length) saveReadingHighlights();
    });

    readingPane.addEventListener("click", function (event) {
      var mark = event.target.closest("mark.reading-highlight");
      if (!mark || !readingPane.contains(mark)) return;
      var parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      mark.remove();
      parent.normalize();
      saveReadingHighlights();
    });
  }

  function initExamEvents() {
    document.getElementById("identityForm").addEventListener("submit", function (event) {
      event.preventDefault();
      var name = document.getElementById("studentName").value.trim().replace(/\s+/g, " ");
      var className = document.getElementById("studentClass").value;
      if (!name || !className || !document.getElementById("honourCheck").checked) return;
      examState = {
        started: true,
        submitted: false,
        answers: {},
        highlights: {},
        identity: { name: name, className: className },
        practiceMode: true
      };
      activePassageId = 1;
      saveExamState();
      showExam();
    });

    document.getElementById("passageTabs").addEventListener("click", function (event) {
      var button = event.target.closest("[data-passage]");
      if (!button) return;
      renderPassage(Number(button.getAttribute("data-passage")));
    });

    document.getElementById("questionPalette").addEventListener("click", function (event) {
      var button = event.target.closest("[data-palette-q]");
      if (!button) return;
      var number = Number(button.getAttribute("data-palette-q"));
      var passage = passageForQuestion(number);
      renderPassage(passage.id, number);
    });

    var questionPane = document.getElementById("questionPane");
    questionPane.addEventListener("input", function (event) {
      if (event.target.matches("[data-question-control]")) recordAnswer(event.target);
    });
    questionPane.addEventListener("change", function (event) {
      if (event.target.matches("[data-question-control]")) recordAnswer(event.target);
    });

    document.getElementById("submitExamTop").addEventListener("click", requestSubmit);
    document.getElementById("submitExamBottom").addEventListener("click", requestSubmit);
    document.getElementById("submitDialog").addEventListener("close", function () {
      if (this.returnValue === "submit") gradeExam(false);
    });
    window.addEventListener("beforeunload", saveExamState);
  }

  function countBlankAnswers() {
    var blank = 0;
    for (var number = 1; number <= 40; number += 1) {
      if (!normaliseAnswer(examState.answers[String(number)])) blank += 1;
    }
    return blank;
  }

  function requestSubmit() {
    var dialog = document.getElementById("submitDialog");
    var copy = document.getElementById("submitDialogCopy");
    var submitButton = dialog.querySelector("[value=\"submit\"]");
    var blank = countBlankAnswers();
    if (blank > 0) {
      copy.textContent = "Em còn " + blank + " câu chưa trả lời. Hãy quay lại hoàn thành đủ 40 câu trước khi nộp.";
      submitButton.disabled = true;
      submitButton.title = "Cần hoàn thành đủ 40 câu";
    } else {
      copy.textContent = "Sau khi nộp, bài sẽ được khóa và chỉ hiển thị số câu sai. Hệ thống không mở đáp án.";
      submitButton.disabled = false;
      submitButton.removeAttribute("title");
    }
    dialog.showModal();
  }

  function restoreTestView() {
    if (examState.submitted) {
      showResult(true);
    } else if (examState.started) {
      showExam();
    } else {
      showTestIntro();
    }
  }

  function showTestIntro() {
    document.body.classList.remove("exam-running");
    document.getElementById("testIntro").hidden = false;
    document.getElementById("examApp").hidden = true;
    document.getElementById("resultScreen").hidden = true;
  }

  function showExam() {
    document.body.classList.add("exam-running");
    document.getElementById("testIntro").hidden = true;
    document.getElementById("resultScreen").hidden = true;
    document.getElementById("examApp").hidden = false;
    renderExamChrome();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function gradeExam(autoSubmitted) {
    if (examState.submitted || examState.grading) return;
    examState.grading = true;
    saveExamState();
    document.querySelectorAll(".submit-exam").forEach(function (button) { button.disabled = true; });
    try {
      var response = await fetch("https://ielts-reading-buoi-02-2026.mstrangtrieuenglishh.chatgpt.site/api/grade-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: examState.answers })
      });
      if (!response.ok) throw new Error("Grading request failed");
      var result = await response.json();
      var correct = Number(result.score);
      var wrong = Number(result.wrong);
      var total = Number(result.total);
      if (!Number.isInteger(correct) || !Number.isInteger(wrong) || total !== 40 || correct + wrong !== total) {
        throw new Error("Invalid grading response");
      }
      examState.submitted = true;
      examState.grading = false;
      examState.autoSubmitted = Boolean(autoSubmitted);
      examState.wrong = wrong;
      examState.submittedAt = Date.now();
      saveExamState();
      showResult(false);
      submitScore(correct, wrong);
    } catch (error) {
      examState.grading = false;
      saveExamState();
      document.querySelectorAll(".submit-exam").forEach(function (button) { button.disabled = false; });
      window.alert("Chưa thể chấm bài trên trình duyệt này. Câu trả lời vẫn đã được lưu; vui lòng tải lại trang và nộp lại.");
      console.error(error);
    }
  }

  function showResult(fromSavedState) {
    document.body.classList.add("exam-running");
    document.getElementById("testIntro").hidden = true;
    document.getElementById("examApp").hidden = true;
    document.getElementById("resultScreen").hidden = false;
    document.getElementById("wrongCount").textContent = "Em sai " + Number(examState.wrong || 0) + "/40 câu";
    document.getElementById("resultName").textContent = examState.identity ? examState.identity.name : "—";
    document.getElementById("resultClass").textContent = examState.identity ? examState.identity.className : "—";
    var status = document.getElementById("recordStatus");
    status.classList.remove("error");
    status.textContent = fromSavedState ? "Kết quả của lần làm này đã được lưu." : "Đang ghi kết quả vào hệ thống…";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function appendHiddenField(form, name, value) {
    if (!name) return;
    var input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value);
    form.appendChild(input);
  }

  function submitScore(correct, wrong) {
    var config = window.READING_SCORE_CONFIG || {};
    var status = document.getElementById("recordStatus");
    if (!config.formResponseUrl || !config.entries || !examState.identity) {
      status.textContent = "Kết quả đã lưu trên thiết bị nhưng biểu mẫu điểm chưa được kết nối.";
      status.classList.add("error");
      return;
    }
    var iframe = document.createElement("iframe");
    var targetName = "reading-score-" + Date.now();
    iframe.name = targetName;
    iframe.hidden = true;
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    var form = document.createElement("form");
    form.method = "POST";
    form.action = config.formResponseUrl;
    form.target = targetName;
    form.hidden = true;
    var entries = config.entries;
    appendHiddenField(form, entries.name, examState.identity.name);
    appendHiddenField(form, entries.className, examState.identity.className);
    appendHiddenField(form, entries.assignmentCode, config.assignmentCode || "IELTS-READING-B02");
    appendHiddenField(form, entries.score, correct);
    appendHiddenField(form, entries.total, 40);
    appendHiddenField(form, entries.wrong, wrong);
    appendHiddenField(form, entries.percent, Math.round(correct / 40 * 100));
    document.body.appendChild(form);
    try {
      form.submit();
      window.setTimeout(function () {
        status.textContent = "Kết quả đã được ghi nhận vào hệ thống.";
        status.classList.remove("error");
        form.remove();
        iframe.remove();
      }, 1800);
    } catch (error) {
      status.textContent = "Kết quả đã lưu trên thiết bị nhưng chưa gửi được lên biểu mẫu. Hãy báo giáo viên.";
      status.classList.add("error");
      console.error(error);
    }
  }

  function init() {
    initTabs();
    initClassOptions();
    initVocabulary();
    initExamEvents();
    initReadingHighlighter();
    if (location.hash === "#test") restoreTestView();
  }

  init();
})();

