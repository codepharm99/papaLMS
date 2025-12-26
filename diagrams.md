# papaLMS diagrams (Mermaid)

## ER diagram (Prisma -> PostgreSQL)
```mermaid
erDiagram
  USER {
    string id
    string username
    string email
    string role
    string name
    datetime createdAt
  }

  PROFILE {
    int id
    string userId
    string email
    string fullName
    string avatarUrl
    datetime createdAt
    datetime updatedAt
  }

  COURSE {
    string id
    string code
    string teacherId
    string title
    string orgTag
    datetime createdAt
  }

  ENROLLMENT {
    string id
    string userId
    string courseId
    datetime createdAt
  }

  MATERIAL {
    string id
    string courseId
    string teacherId
    string title
    string url
    datetime createdAt
  }

  WEEKLY_SCORE {
    string id
    string studentId
    string courseId
    int week
    int part
    int lectureScore
    int practiceScore
    int individualWorkScore
    int ratingScore
    int midtermScore
    int examScore
    datetime createdAt
    datetime updatedAt
  }

  TEACHER_INVITE {
    string id
    string code
    string createdById
    string usedById
    datetime createdAt
    datetime usedAt
  }

  TEST {
    string id
    string teacherId
    string title
    string publicCode
    datetime publishedAt
    datetime createdAt
  }

  QUESTION {
    string id
    string testId
    string text
    json options
    int correctIndex
    json correctIndices
    datetime createdAt
  }

  TEST_ASSIGNMENT {
    string id
    string testId
    string studentId
    string assignedById
    string status
    int score
    int total
    datetime completedAt
    datetime createdAt
  }

  GUEST_TEST_ATTEMPT {
    string id
    string testId
    string name
    int score
    int total
    datetime createdAt
  }

  PRESENTATION {
    string id
    string teacherId
    string title
    json slides
    datetime createdAt
    datetime updatedAt
  }

  USER ||--o{ COURSE : teaches
  USER ||--o{ ENROLLMENT : enrolls
  COURSE ||--o{ ENROLLMENT : has
  COURSE ||--o{ MATERIAL : has
  USER ||--o{ MATERIAL : authors
  USER ||--o{ WEEKLY_SCORE : receives
  COURSE ||--o{ WEEKLY_SCORE : includes
  USER ||--o{ TEACHER_INVITE : creates
  USER ||--o{ TEACHER_INVITE : uses
  USER ||--o| PROFILE : has
  USER ||--o{ TEST : creates
  TEST ||--o{ QUESTION : has
  TEST ||--o{ TEST_ASSIGNMENT : assigns
  USER ||--o{ TEST_ASSIGNMENT : student
  USER ||--o{ TEST_ASSIGNMENT : assigned_by
  TEST ||--o{ GUEST_TEST_ATTEMPT : guest_attempts
  USER ||--o{ PRESENTATION : creates
```

## Use-case (roles)
```mermaid
flowchart LR
  Guest([Guest])
  Student([Student])
  Teacher([Teacher])
  Admin([Admin])

  UC1((Browse catalog))
  UC2((Enroll in course))
  UC3((Access materials))
  UC4((Take assigned test))
  UC5((Take public test))
  UC6((View weekly scores))
  UC7((Create course))
  UC8((Manage materials))
  UC9((Create tests & questions))
  UC10((Assign tests))
  UC11((Publish public test))
  UC12((Review submissions))
  UC13((Set weekly scores))
  UC14((Generate presentations))
  UC15((Create teacher invites))
  UC16((Manage teachers/students))

  Guest --> UC1
  Guest --> UC5
  Student --> UC1
  Student --> UC2
  Student --> UC3
  Student --> UC4
  Student --> UC6
  Teacher --> UC7
  Teacher --> UC8
  Teacher --> UC9
  Teacher --> UC10
  Teacher --> UC11
  Teacher --> UC12
  Teacher --> UC13
  Teacher --> UC14
  Admin --> UC15
  Admin --> UC16
```

## User flow (Teacher)
```mermaid
graph TD
    Start([Teacher opens papaLMS]) --> Dashboard[Teacher Dashboard]
    
    Dashboard --> Action{Choose action}
    
    Action --> ManageCourses[Manage Courses]
    ManageCourses --> CourseAction{Action?}
    CourseAction -->|Create new| CreateCourse[Create Course]
    CreateCourse --> EnterDetails[Enter title, code, orgTag]
    EnterDetails --> SaveCourse[Save course]
    CourseAction -->|Edit existing| SelectCourse[Select course]
    SelectCourse --> EditCourse[Edit course details]
    
    Action --> ManageMaterials[Manage Materials]
    ManageMaterials --> SelectCourseMat[Select course]
    SelectCourseMat --> MatAction{Action?}
    MatAction -->|Upload new| UploadMat[Upload material]
    UploadMat --> EnterMatDetails[Enter title, URL]
    EnterMatDetails --> SaveMat[Save material]
    MatAction -->|Delete| DeleteMat[Delete material]
    
    Action --> ManageTests[Manage Tests]
    ManageTests --> TestAction{Action?}
    TestAction -->|Create new| CreateTest[Create Test]
    CreateTest --> EnterTestTitle[Enter test title]
    EnterTestTitle --> AddQuestions[Add Questions]
    AddQuestions --> EnterQuestion[Enter question text]
    EnterQuestion --> EnterOptions[Enter answer options]
    EnterOptions --> MarkCorrect[Mark correct answer]
    MarkCorrect --> MoreQ{Add more questions?}
    MoreQ -->|Yes| EnterQuestion
    MoreQ -->|No| TestReady[Test ready]
    
    TestAction -->|Assign existing| SelectTest[Select test]
    SelectTest --> AssignAction{Assign to?}
    AssignAction -->|Student| SelectStudent[Select student]
    SelectStudent --> CreateAssignment[Create assignment]
    AssignAction -->|Public| PublishTest[Publish with public code]
    PublishTest --> GenerateCode[Generate unique code]
    GenerateCode --> ShareCode[Share code with students]
    
    TestAction -->|Review| SelectTestReview[Select test]
    SelectTestReview --> ViewSubmissions[View submissions]
    ViewSubmissions --> ReviewAnswers[Review student answers]
    ReviewAnswers --> SeeScore[See auto-graded score]
    
    Action --> SetGrades[Set Weekly Scores]
    SetGrades --> SelectCourseGrade[Select course]
    SelectCourseGrade --> SelectStudent2[Select student]
    SelectStudent2 --> SelectWeek[Select week & part]
    SelectWeek --> EnterScores[Enter scores]
    EnterScores --> ScoreTypes[Lecture, Practice, Individual, Rating, Midterm, Exam]
    ScoreTypes --> SaveScores[Save weekly scores]
    
    Action --> CreatePresentation[Generate Presentation]
    CreatePresentation --> EnterTopic[Enter topic/prompt]
    EnterTopic --> AIGenerate[AI generates slides]
    AIGenerate --> ReviewSlides[Review presentation]
    ReviewSlides --> EditSlides{Edit slides?}
    EditSlides -->|Yes| ModifySlides[Modify content]
    ModifySlides --> SavePresentation[Save presentation]
    EditSlides -->|No| SavePresentation
    
    SaveCourse --> End([End])
    SaveMat --> End
    DeleteMat --> End
    CreateAssignment --> End
    ShareCode --> End
    SeeScore --> End
    SaveScores --> End
    SavePresentation --> End
```

## Sequence: enroll in course
```mermaid
sequenceDiagram
  actor Student
  participant Web as Web App
  participant API as /api/courses/:id/enroll
  participant DB as PostgreSQL

  Student->>Web: Click "Enroll"
  Web->>API: POST /api/courses/:id/enroll
  API->>DB: toggle Enrollment (userId, courseId)
  DB-->>API: created/removed
  API-->>Web: { isEnrolled }
  Web-->>Student: UI updated
```

## Sequence: assign test -> submit -> review
```mermaid
sequenceDiagram
  actor Teacher
  actor Student
  participant Web as Web App
  participant API as Next.js API
  participant DB as PostgreSQL

  Teacher->>Web: Create test
  Web->>API: POST /api/teacher/tests
  API->>DB: INSERT Test

  Teacher->>Web: Add questions
  Web->>API: POST /api/teacher/tests/:id/questions
  API->>DB: INSERT Question(s)

  Teacher->>Web: Assign test
  Web->>API: POST /api/teacher/assignments (testId, studentId)
  API->>DB: INSERT TestAssignment (ASSIGNED)

  Student->>Web: Open assignments
  Web->>API: GET /api/student/tests
  API->>DB: SELECT assignments
  Web-->>Student: Assignment list

  Student->>Web: Submit answers
  Web->>API: POST /api/student/tests/:aid/submit
  API->>DB: UPDATE TestAssignment (answers, score, COMPLETED)

  Teacher->>Web: Review assignment
  Web->>API: GET /api/teacher/assignments/:aid
  API->>DB: SELECT assignment
  Web-->>Teacher: Results
```

## Sequence: public test (guest)
```mermaid
sequenceDiagram
  actor Guest
  participant Web as Web App
  participant API as /api/tests/:code
  participant DB as PostgreSQL

  Guest->>Web: Open /tests/{code}
  Web->>API: GET /api/tests/:code
  API->>DB: SELECT Test + Questions
  Web-->>Guest: Render questions

  Guest->>Web: Submit answers
  Web->>API: POST /api/tests/:code/submit
  API->>DB: INSERT GuestTestAttempt
  Web-->>Guest: Score result
```

## Directory structure (high level)
```text
.
├── README.md
├── BACKEND.md
├── package.json
├── next.config.ts
├── tailwind.config.js
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.cjs
├── prompts/
├── public/
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── admin/
    │   │   ├── auth/
    │   │   ├── courses/
    │   │   ├── student/
    │   │   ├── teacher/
    │   │   ├── tests/
    │   │   └── ...
    │   ├── admin/
    │   ├── catalog/
    │   ├── course/
    │   ├── grades/
    │   ├── login/
    │   ├── presentations/
    │   ├── profile/
    │   ├── student/
    │   ├── teacher/
    │   ├── tests/
    │   └── page.tsx
    ├── components/
    ├── generated/
    ├── lib/
    └── types/
```
