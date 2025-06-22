import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Play, ArrowLeft, X, FileText, Download, ExternalLink, Folder, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';
import { Globe } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
}

interface Document {
  id: string;
  title: string;
  description: string;
  url: string;
}

interface DocumentFolder {
  id: string;
  title: string;
  description: string;
  documents: Document[];
}

interface GeorgianEducationalResource {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'folder';
  url?: string;
  folder?: DocumentFolder;
}

const englishVideos: Video[] = [
  {
    id: '1',
    title: "From Fertilization To Childbirth And Breastfeeding",
    description: "A comprehensive journey through pregnancy, from conception to breastfeeding, explaining key developmental stages and processes.",
    youtubeId: 'SJSbLkZbfps',
  },
  {
    id: '2',
    title: 'STD | Infection HPV | Pap Smear Test',
    description: 'Understanding HPV infection, its implications, and the importance of Pap smear testing for early detection.',
    youtubeId: 'rrlKQLCdMWU',
  },
  {
    id: '3',
    title: 'Menstruation and Polycystic Ovary Syndrome (PCOS)',
    description: 'Learn about PCOS, its causes, symptoms, and impact on menstruation and overall health.',
    youtubeId: 'Mc5iK0AtGNc',
  },
  {
    id: '4',
    title: 'Pregnancy: A Month-By-Month Guide',
    description: 'Detailed monthly progression of pregnancy, highlighting key developments and changes.',
    youtubeId: '8BH7WFmRs-E',
  },
  {
    id: '5',
    title: 'The Miracle of Twin Fertilizations',
    description: 'Understanding the unique process of twin conception and development.',
    youtubeId: 'fpL1y2SD1fU',
  },
  {
    id: '6',
    title: 'Epidural Anesthesia | 3D Animation',
    description: 'Detailed explanation of epidural anesthesia procedure with real footage and 3D animation.',
    youtubeId: 'KHrED6tvG4I',
  },
  {
    id: '7',
    title: 'Cesarean Section (C-section) Explained',
    description: 'Comprehensive guide to C-section delivery, including procedure steps and recovery.',
    youtubeId: 'pSJcxYg1QQ4',
  },
  {
    id: '8',
    title: 'Human Life In The Womb | Baby Olivia',
    description: 'Unprecedented visualization of fetal development throughout pregnancy.',
    youtubeId: 'S-lQOooYAs8',
  },
  {
    id: '9',
    title: 'First Trimester | 3D Animated Guide',
    description: 'Detailed 3D animation of the crucial first trimester of pregnancy.',
    youtubeId: 'E0i7NQsJdWY',
  },
  {
    id: '10',
    title: 'Third Trimester | 3D Animated Guide',
    description: 'Comprehensive look at the final stage of pregnancy with detailed 3D animations.',
    youtubeId: 'n7BSXMvo3O4',
  },
  {
    id: '11',
    title: 'Second Trimester of Pregnancy',
    description: 'In-depth exploration of the middle stage of pregnancy and fetal development.',
    youtubeId: 'usxM_dhEK6M',
  },
];

const georgianEducationalResources: GeorgianEducationalResource[] = [
  {
    id: '1',
    title: 'ორსულთა ვარჯიშები',
    description: 'რეკომენდებული ვარჯიშები ორსულობის პერიოდში ჯანმრთელობის შესანარჩუნებლად და მშობიარობისთვის მოსამზადებლად',
    type: 'document',
    url: 'https://drive.google.com/file/d/1IoJS9gQuLlgY_YLTVC7tKC8sD7RylSKT/view?usp=drive_link',
  },
  {
    id: '2',
    title: 'ანტენატალური მეთვალყურეობა',
    description: 'ინფორმაცია ანტენატალური მეთვალყურეობის შესახებ, რეკომენდაციები და მნიშვნელოვანი ასპექტები',
    type: 'document',
    url: 'https://docs.google.com/document/d/1Tf_z4QMo4eFpLgY_hMbgvT08jTHGLijQ/edit?usp=drive_link&ouid=115264195349483882998&rtpof=true&sd=true',
  },
  {
    id: '3',
    title: 'კვებითი რეკომენდაციები ორსულთათვის',
    description: 'მნიშვნელოვანი რეკომენდაციები ორსულთა კვების შესახებ, საჭირო საკვები ნივთიერებები და პრაქტიკული რჩევები',
    type: 'document',
    url: 'https://drive.google.com/file/d/16aAcwUblHNWIwZzHzK99-Ra-e5hMEJM2/view?usp=sharing',
  },
  {
    id: '4',
    title: 'ორსულთა სკოლა',
    description: 'სრული საგანმანათლებლო კურსი ორსული ქალებისთვის - ვარჯიშები, მეცადინეობები, მოდუნება და მშობიარობისთვის მომზადება',
    type: 'folder',
    folder: {
      id: 'pregnant-school',
      title: 'ორსულთა სკოლა',
      description: 'სრული საგანმანათლებლო კურსი ორსული ქალებისთვის',
      documents: [
        {
          id: 'pregnant-1',
          title: 'ორსულობის ვარჯიშები',
          description: 'რეკომენდებული ვარჯიშები ორსულობის პერიოდში ფიზიკური მომზადებისთვის',
          url: 'https://drive.google.com/file/d/1TmGIFGk6O83R7IfSQJC9W9n4pdFulk0C/view?usp=sharing'
        },
        {
          id: 'pregnant-2',
          title: 'მეცადინეობა ნაწილი 1',
          description: 'პირველი მეცადინეობა ორსულთა სკოლაში - ძირითადი ცოდნა და მომზადება',
          url: 'https://drive.google.com/file/d/1Yi2IczKMSPe_p12ywi-RdqBEWEPrgFzi/view?usp=sharing'
        },
        {
          id: 'pregnant-3',
          title: 'მეცადინეობა ნაწილი 2-3',
          description: 'მეორე და მესამე მეცადინეობა - გაღრმავებული ცოდნა და პრაქტიკული რჩევები',
          url: 'https://drive.google.com/file/d/1ppK3in1jTRanX0e3BSoexjgAtiK7AYwX/view?usp=sharing'
        },
        {
          id: 'pregnant-4',
          title: 'მეცადინეობა ნაწილი 4-5',
          description: 'მეოთხე და მეხუთე მეცადინეობა - პრაქტიკული უნარები და მომზადება',
          url: 'https://drive.google.com/file/d/1wxn7dHd2mhNRZ3-0Tr5wP4-8fAyXetKJ/view?usp=sharing'
        },
        {
          id: 'pregnant-5',
          title: 'მეცადინეობა ნაწილი 6-10',
          description: 'მეექვსიდან მეათე მეცადინეობამდე - სრული კურსის დასრულება',
          url: 'https://drive.google.com/file/d/1Ib9GuDMSGwOxmH31tcEiALSW7J-PHkPf/view?usp=sharing'
        },
        {
          id: 'pregnant-6',
          title: 'მოდუნება',
          description: 'მოდუნების ტექნიკები და რელაქსაციის მეთოდები ორსულობის პერიოდში',
          url: 'https://drive.google.com/file/d/1nK3Xm9gBQYpIeA0l9Qu5UKapJ_bEbigH/view?usp=sharing'
        },
        {
          id: 'pregnant-7',
          title: 'მშობელთა სკოლა',
          description: 'მშობელთა მომზადება და ფსიქოლოგიური მხარდაჭერა',
          url: 'https://drive.google.com/file/d/1oe0DbRml32qRbe1PQQPJEkksAcjYSK8M/view?usp=sharing'
        },
        {
          id: 'pregnant-8',
          title: 'ნაყოფის გამოდევნა',
          description: 'ინფორმაცია მშობიარობის პროცესისა და ნაყოფის გამოდევნის შესახებ',
          url: 'https://drive.google.com/file/d/1dF5bue76X0iTa81Atw7YiDwKFvu0thxh/view?usp=sharing'
        },
        {
          id: 'pregnant-9',
          title: 'სუნთქვა',
          description: 'სუნთქვის ტექნიკები მშობიარობისა და ორსულობის დროს',
          url: 'https://drive.google.com/file/d/1aQo_BhdFDVtnDtPZvEsgNktC96NiKZbL/view?usp=sharing'
        },
        {
          id: 'pregnant-10',
          title: 'ორსულთა სკოლა',
          description: 'ზოგადი ინფორმაცია და რეკომენდაციები ორსულთა სკოლის შესახებ',
          url: 'https://drive.google.com/file/d/1j8ti8zSTNx1B1JZHxe51o_HU6NtqMJeX/view?usp=sharing'
        }
      ]
    }
  }
];

const russianVideos: Video[] = [
  {
    id: '1',
    title: '1 неделя беременности',
    description: 'Признаки, симптомы, ощущения, что происходит с малышом и в организме женщины',
    youtubeId: '8G2WnPZaM38',
  },
  {
    id: '2',
    title: '2 неделя беременности',
    description: 'Как распознать овуляцию, симптомы, ощущения, что происходит, вредные привычки',
    youtubeId: 'd-XuIYP1zRY',
  },
  {
    id: '3',
    title: '3 неделя беременности',
    description: 'Что происходит с плодом, внематочная беременность, изменение аппетита, ХГЧ',
    youtubeId: 'DIxNoYfHhvA',
  },
  {
    id: '4',
    title: '4 неделя беременности',
    description: 'Что происходит с плодом и что чувствует женщина, как выглядит ребенок, УЗИ',
    youtubeId: 'QE4M8deH-vo',
  },
  {
    id: '5',
    title: '5 неделя беременности',
    description: 'Что происходит с плодом и что чувствует женщина, правильное питание, симптомы',
    youtubeId: 'ybsKXZWZTp0',
  },
  {
    id: '6',
    title: '6 неделя беременности',
    description: 'Что происходит с плодом и что чувствует женщина, УЗИ, сердцебиение, двойня',
    youtubeId: 'Cpsu86ZEq94',
  },
  {
    id: '7',
    title: '7 неделя беременности',
    description: 'Что происходит с малышом и мамой. УЗИ, боли, как выглядит плод, ощущения',
    youtubeId: 'S7dTMWyCh8g',
  },
  {
    id: '8',
    title: '8 неделя беременности',
    description: 'Что происходит с малышом и мамой. Первый скрининг, УЗИ, как выглядит плод',
    youtubeId: 'MvBwA-932Qg',
  },
  {
    id: '9',
    title: '9 неделя беременности',
    description: 'Что происходит с малышом и мамой. УЗИ, как выглядит плод, ощущения в животе',
    youtubeId: 'ukKnV8TJSxs',
  },
  {
    id: '10',
    title: '10 неделя беременности',
    description: 'УЗИ, ощущения, развитие плода, как выглядит ребенок, кровянистые выделения',
    youtubeId: 'TjZ7-Qk761w',
  },
  {
    id: '11',
    title: '11 неделя беременности',
    description: 'УЗИ, что происходит, ощущения, боли, как выглядит плод. Запрещённые продукты',
    youtubeId: 'ikud8cCtb-w',
  },
  {
    id: '12',
    title: '12 неделя беременности',
    description: 'Что происходит с малышом и мамой, как выглядит ребенок, можно ли узнать пол',
    youtubeId: '9t1Sgnz2UoM',
  },
  {
    id: '13',
    title: '13 неделя беременности',
    description: 'Что происходит с малышом и мамой, как выглядит ребенок, изменение вкуса',
    youtubeId: 'Kb3Kh0smGOk',
  },
  {
    id: '14',
    title: '14 неделя беременности',
    description: 'Что происходит с малышом и мамой, как выглядит ребенок, ощущения',
    youtubeId: 'SHQdTKNsfSs',
  },
  {
    id: '15',
    title: '15 неделя беременности',
    description: 'Как выглядит ребенок, УЗИ, что происходит с малышом и мамой, ощущения',
    youtubeId: 'N4MUsM_ur-U',
  },
  {
    id: '16',
    title: '16 неделя беременности',
    description: 'Что происходит с малышом и мамой, ощущения женщины',
    youtubeId: 'GHvNtIU_KC8',
  },
  {
    id: '17',
    title: '17 неделя беременности',
    description: 'Все что вы должны знать о развитии плода и изменениях в организме',
    youtubeId: 'TIXJFkg5fqA',
  },
  {
    id: '18',
    title: '18 неделя беременности',
    description: 'Что происходит с малышом и мамой, ощущения женщины, УЗИ, шевеления',
    youtubeId: 'eNoXz8F8VHQ',
  },
  {
    id: '19',
    title: '19 неделя беременности',
    description: 'Что происходит с малышом и мамой, УЗИ, молочница, как выглядит малыш',
    youtubeId: '6RN3JdQqgDY',
  },
  {
    id: '20',
    title: '20 неделя беременности',
    description: 'Как выглядит ребенок, плохой сон, шевеления, УЗИ, скрининг, что происходит',
    youtubeId: '-UrEwteJZC0',
  },
  {
    id: '21',
    title: '21 неделя беременности',
    description: 'Как выглядит малыш, что происходит с малышом и мамой, УЗИ, высыпания, стресс',
    youtubeId: 'lfGE9FC9bUU',
  },
  {
    id: '22',
    title: '22 неделя беременности',
    description: 'Что происходит с малышом и мамой, как выглядит ребенок, УЗИ, растяжки',
    youtubeId: 'dlA8Rb6n334',
  },
  {
    id: '23',
    title: '23 неделя беременности',
    description: 'Что происходит с малышом и мамой, развитие плода, забор пуповинной крови, УЗИ',
    youtubeId: 'Bcm2ipwVO3Y',
  },
  {
    id: '24',
    title: '24 неделя беременности',
    description: 'Развитие плода, как выглядит малыш, что происходит, ГТТ, выделения, глюкоза',
    youtubeId: 'HGBZxtjE9iQ',
  },
  {
    id: '25',
    title: '25 неделя беременности',
    description: 'Как выглядит ребенок, что происходит, УЗИ, шевеления, преэклампсия, геморрой',
    youtubeId: 'CMZtslflWm4',
  },
  {
    id: '26',
    title: '26 неделя беременности',
    description: 'Как выглядит малыш, что происходит, УЗИ, шевеления, боли в пояснице',
    youtubeId: 'dsrx8gR9i0Y',
  },
  {
    id: '27',
    title: '27 неделя беременности',
    description: 'Как выглядит малыш, что происходит, УЗИ, выделения, судороги, варикоз',
    youtubeId: 'W8qvf4Aztc0',
  },
  {
    id: '28',
    title: '28 неделя беременности',
    description: 'УЗИ, что происходит, как выглядит малыш, шевеления, преэклампсия, эклампсия',
    youtubeId: 'QuwdpuOx_fc',
  },
  {
    id: '29',
    title: '29 неделя беременности',
    description: 'Запоры, геморрой, КТГ, УЗИ, как выглядит малыш, подсчёт шевелений',
    youtubeId: 'qV-V7CHZXv0',
  },
  {
    id: '30',
    title: '30 неделя беременности',
    description: 'Как выглядит ребенок, что происходит, УЗИ, шевеления, страх, декретный отпуск',
    youtubeId: 'kCvgatLuh_A',
  },
  {
    id: '31',
    title: '31 неделя беременности',
    description: 'Как выглядит ребенок, что происходит, УЗИ, молозиво, схватки Брэкстона-Хикса',
    youtubeId: 'NEgoEw9sigs',
  },
  {
    id: '32',
    title: '32 неделя беременности',
    description: 'Как выглядит ребенок, УЗИ, что происходит с малышом и мамой, растяжки',
    youtubeId: 'YyvHY46iWx4',
  },
  {
    id: '33',
    title: '33 неделя беременности',
    description: 'Что происходит с малышом и мамой, покалывания в пальцах, дневник шевелений',
    youtubeId: 'PBbsmIFJQ6k',
  },
  {
    id: '34',
    title: '34 неделя беременности',
    description: 'Как выглядит малыш, преждевременные роды, что происходит, кесарево сечение',
    youtubeId: 'a7PYfq9pNLI',
  },
  {
    id: '35',
    title: '35 неделя беременности',
    description: 'Что происходит, как выглядит малыш, стрептококк, можно ли рожать, роддом',
    youtubeId: 'mJVsjCIew48',
  },
  {
    id: '36',
    title: '36 неделя беременности',
    description: 'Тайны беременности и ожидание. Важное в этот период',
    youtubeId: '05RF9prY2G8',
  },
  {
    id: '37',
    title: '37 неделя беременности',
    description: 'Как начинаются роды? Все ответы от доктора',
    youtubeId: 'jEcML0JaakY',
  },
  {
    id: '38',
    title: '38 неделя беременности',
    description: 'Что взять в родильный дом? Как избежать отеков во время беременности?',
    youtubeId: 'OadGCl6upUc',
  },
  {
    id: '39',
    title: '39 неделя беременности',
    description: 'Обвитие малыша пуповиной. Первый крик малыша. Вес ребенка',
    youtubeId: '2XS2sXE01M4',
  },
  {
    id: '40',
    title: '40 неделя беременности',
    description: 'Стимуляция родов. Малыш реагирует на звук. Как пеленать ребенка',
    youtubeId: 'RSqmElN6rFU',
  },
  {
    id: '41',
    title: '41 неделя беременности',
    description: 'Схватки. Эпидуральная анестезия. Окситоцин, гормон любви',
    youtubeId: 'SUABTpwjFiM',
  },
  {
    id: '42',
    title: 'Беременность - физиологические процессы',
    description: 'Физиологические процессы и изменения во время беременности',
    youtubeId: 'UcgmRCLdkJs',
  },
  {
    id: '43',
    title: 'Кисты яичников',
    description: 'Что такое, виды, симптомы, осложнения, принцип лечения',
    youtubeId: 'AiCODCQNOFw',
  },
  {
    id: '44',
    title: 'Менструальный цикл',
    description: 'Подробное объяснение менструального цикла и связанных процессов',
    youtubeId: '4I6a_p3jtu0',
  },
  {
    id: '45',
    title: 'Менопауза',
    description: 'Причины, механизм, физиология менопаузы',
    youtubeId: 'ZujXC3KvbO0',
  },
  {
    id: '46',
    title: 'Эпидуральная анестезия',
    description: 'Подробное объяснение процедуры эпидуральной анестезии',
    youtubeId: 'GPnyTwunZwQ',
  },
];

interface VideoModalProps {
  video: Video;
  onClose: () => void;
}

function VideoModal({ video, onClose }: VideoModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="youtube-modal"
    >
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="youtube-modal-content">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-dark-800/80 rounded-full hover:bg-dark-700/80 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <div className="aspect-video">
            <LiteYouTubeEmbed
              id={video.youtubeId}
              title={video.title}
              poster="maxresdefault"
              noCookie={true}
            />
          </div>
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">{video.title}</h3>
            <p className="text-dark-100">{video.description}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function VideoCard({ video, onPlay }: { video: Video; onPlay: (video: Video) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 overflow-hidden hover:border-cyan-400/30 transition-all duration-300 group"
    >
      <div className="relative aspect-video">
        <img
          src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 to-transparent opacity-60" />
        <button
          onClick={() => onPlay(video)}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-cyan-500/20 backdrop-blur-sm flex items-center justify-center border border-cyan-400/30 transform group-hover:scale-110 transition-transform duration-300">
            <Play className="w-8 h-8 text-white fill-current" />
          </div>
        </button>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-300 transition-colors">
          {video.title}
        </h3>
        <p className="text-dark-100">{video.description}</p>
        <button
          onClick={() => onPlay(video)}
          className="inline-flex items-center mt-4 text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          Watch Video
          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
        </button>
      </div>
    </motion.div>
  );
}

function EducationalResourceCard({ 
  resource, 
  onFolderClick 
}: { 
  resource: GeorgianEducationalResource; 
  onFolderClick?: (folder: DocumentFolder) => void; 
}) {
  if (resource.type === 'folder' && resource.folder) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 overflow-hidden hover:border-cyan-400/30 transition-all duration-300 group cursor-pointer"
        onClick={() => onFolderClick?.(resource.folder!)}
      >
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Folder className="w-10 h-10 text-cyan-400 mr-3" />
            <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
              {resource.title}
            </h3>
            <ChevronRight className="w-5 h-5 text-cyan-400 ml-auto group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="text-dark-100 mb-4">{resource.description}</p>
          <div className="flex items-center text-sm text-cyan-400">
            <FileText className="w-4 h-4 mr-1" />
            {resource.folder.documents.length} დოკუმენტი
          </div>
        </div>
      </motion.div>
    );
  }

  // Regular document
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 overflow-hidden hover:border-cyan-400/30 transition-all duration-300 group"
    >
      <div className="p-6">
        <div className="flex items-center mb-4">
          <FileText className="w-10 h-10 text-cyan-400 mr-3" />
          <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
            {resource.title}
          </h3>
        </div>
        <p className="text-dark-100 mb-4">{resource.description}</p>
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center mt-2 text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          გახსნა / ჩამოტვირთვა
        </a>
      </div>
    </motion.div>
  );
}

function DocumentCard({ document }: { document: Document }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 overflow-hidden hover:border-cyan-400/30 transition-all duration-300 group"
    >
      <div className="p-6">
        <div className="flex items-center mb-4">
          <FileText className="w-10 h-10 text-cyan-400 mr-3" />
          <h3 className="text-xl font-semibold text-white group-hover:text-cyan-300 transition-colors">
            {document.title}
          </h3>
        </div>
        <p className="text-dark-100 mb-4">{document.description}</p>
        <a
          href={document.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center mt-2 text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          გახსნა / ჩამოტვირთვა
        </a>
      </div>
    </motion.div>
  );
}

export function Education() {
  const { t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'russian' | 'georgian' | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<DocumentFolder | null>(null);

  const handleLanguageSelect = (language: 'english' | 'russian' | 'georgian') => {
    setSelectedLanguage(language);
    setSelectedFolder(null); // Reset folder selection when changing language
  };

  const handleFolderClick = (folder: DocumentFolder) => {
    setSelectedFolder(folder);
  };

  const handleBackToResources = () => {
    setSelectedFolder(null);
  };

  return (
    <div className="min-h-screen bg-dark-900 pt-16 pb-8">
      {/* Neon Effect */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-cyan-400 shadow-[0_0_15px_5px_rgba(34,211,238,0.5)] z-50" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('education.title')}</h1>
          <p className="text-xl text-dark-100">{t('education.subtitle')}</p>
        </div>

        {!selectedLanguage ? (
          // Language Selection Screen
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Georgian Selection */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLanguageSelect('georgian')}
                className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 p-8 hover:border-cyan-400/30 transition-all duration-300 text-left group"
              >
                <div className="flex items-center mb-4">
                  <Globe className="w-8 h-8 text-cyan-400 mr-3" />
                  <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {t('education.georgian.title')}
                  </h3>
                </div>
                <p className="text-dark-100">
                  სასწავლო მასალები ქართულ ენაზე
                </p>
              </motion.button>

              {/* English Selection */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLanguageSelect('english')}
                className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 p-8 hover:border-cyan-400/30 transition-all duration-300 text-left group"
              >
                <div className="flex items-center mb-4">
                  <Globe className="w-8 h-8 text-cyan-400 mr-3" />
                  <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {t('education.english.title')}
                  </h3>
                </div>
                <p className="text-dark-100">
                  Access educational content in English
                </p>
              </motion.button>

              {/* Russian Selection */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleLanguageSelect('russian')}
                className="bg-dark-800/50 backdrop-blur-sm rounded-xl border border-dark-700/30 p-8 hover:border-cyan-400/30 transition-all duration-300 text-left group"
              >
                <div className="flex items-center mb-4">
                  <Globe className="w-8 h-8 text-cyan-400 mr-3" />
                  <h3 className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {t('education.russian.title')}
                  </h3>
                </div>
                <p className="text-dark-100">
                  Access educational content in Russian
                </p>
              </motion.button>
            </div>
          </div>
        ) : selectedFolder ? (
          // Folder Contents View
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={handleBackToResources}
                className="flex items-center text-dark-100 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                უკან დაბრუნება
              </button>
            </div>
            
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-4">
                <Folder className="w-12 h-12 text-cyan-400 mr-4" />
                <h2 className="text-3xl font-bold text-white">{selectedFolder.title}</h2>
              </div>
              <p className="text-xl text-dark-100">{selectedFolder.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {selectedFolder.documents.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          </div>
        ) : (
          // Content List Section
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setSelectedLanguage(null)}
                className="flex items-center text-dark-100 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to language selection
              </button>
            </div>
            
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">
                  {selectedLanguage === 'english' 
                    ? t('education.english.title')
                    : selectedLanguage === 'russian'
                    ? t('education.russian.title')
                    : t('education.georgian.title')
                  }
                </h2>
                <div className="h-[1px] flex-1 mx-6 bg-gradient-to-r from-transparent via-dark-700 to-transparent" />
              </div>

              {selectedLanguage === 'georgian' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {georgianEducationalResources.map((resource) => (
                    <EducationalResourceCard 
                      key={resource.id} 
                      resource={resource} 
                      onFolderClick={handleFolderClick}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {(selectedLanguage === 'english' ? englishVideos : russianVideos).map((video) => (
                    <VideoCard key={video.id} video={video} onPlay={setSelectedVideo} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <AnimatePresence>
          {selectedVideo && (
            <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}