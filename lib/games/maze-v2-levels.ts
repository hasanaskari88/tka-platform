export type MazeV2Point = { x: number; y: number }

type MazeV2LevelDefinition = {
  level: number
  title: string
  instruction: string
  path: MazeV2Point[]
}

const LEVEL_DEFINITIONS: MazeV2LevelDefinition[] = [
  {
    level: 1,
    title: 'Jalur Lurus',
    instruction: 'Arahkan robot lurus menuju bintang. Kenali blok Maju.',
    path: [
      { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 },
      { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
    ],
  },
  {
    level: 2,
    title: 'Belok Pertama',
    instruction: 'Robot harus maju, berbelok, lalu melanjutkan perjalanan.',
    path: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 },
      { x: 4, y: 2 },
    ],
  },
  {
    level: 3,
    title: 'Jalur Zig-zag',
    instruction: 'Rencanakan beberapa belokan agar robot sampai ke bintang.',
    path: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 },
      { x: 4, y: 2 }, { x: 4, y: 3 }, { x: 4, y: 4 },
      { x: 5, y: 4 },
    ],
  },
  {
    level: 4,
    title: 'Lorong Berliku',
    instruction: 'Gunakan urutan perintah yang tepat untuk melewati lorong.',
    path: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
      { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 },
      { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 4, y: 2 },
      { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 },
    ],
  },
  {
    level: 5,
    title: 'Tantangan Ahli',
    instruction: 'Jalur lebih panjang! Susun algoritma dengan teliti dan manfaatkan Ulangi.',
    path: [
      { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 },
      { x: 2, y: 5 }, { x: 2, y: 4 }, { x: 3, y: 4 },
      { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 },
      { x: 5, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 1 },
      { x: 6, y: 0 },
    ],
  },
]

/**
 * Membuat lima misi Maze V2 dengan jalur yang sudah dipastikan tersambung.
 * Setiap kotak di luar jalur menjadi dinding, sehingga semua level punya
 * solusi dan tidak mungkin memiliki start/target yang tertutup.
 */
export function createMazeV2LevelQuestions(examId: string) {
  const width = 7
  const height = 7

  return LEVEL_DEFINITIONS.map((definition) => {
    const pathKeys = new Set(
      definition.path.map((point) => `${point.x},${point.y}`)
    )
    const obstacles: MazeV2Point[] = []

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!pathKeys.has(`${x},${y}`)) obstacles.push({ x, y })
      }
    }

    const start = definition.path[0]
    const target = definition.path[definition.path.length - 1]

    return {
      exam_id: examId,
      question_text: `Level ${definition.level} · ${definition.title}. ${definition.instruction}`,
      options: [],
      correct_option: 'GOAL',
      question_type: 'maze_game_v2',
      start_x: start.x,
      start_y: start.y,
      target_x: target.x,
      target_y: target.y,
      maze_width: width,
      maze_height: height,
      obstacles,
      difficulty: definition.level <= 2 ? 'easy' : definition.level <= 4 ? 'medium' : 'hard',
      explanation:
        'Susun blok Maju dan Belok untuk mengikuti lorong. Blok Ulangi dapat membantu menghemat perintah; Jika Jalan Terbuka akan maju satu kotak hanya ketika jalurnya aman.',
    }
  })
}

export function getMazeV2LevelNumber(
  mission: { difficulty?: string | null; question_text?: string | null },
  index = 0
) {
  const source = `${mission.question_text ?? ''} ${mission.difficulty ?? ''}`
  const match = source.match(/level[-_ ]?(\d+)/i)
  const level = match ? Number(match[1]) : index + 1
  return Number.isInteger(level) && level >= 1 && level <= 5 ? level : index + 1
}
