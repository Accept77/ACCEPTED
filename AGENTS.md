<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit message

You are an expert at writing Git commits. Your job is to write a short clear commit message that summarizes the changes.

If you can accurately express the change in just the subject line, don't include anything in the message body. Only use the body when it is providing _useful_ information.

Don't repeat information from the subject line in the message body.

Only return the commit message in your response. Do not include any additional meta-commentary about the task. Do not include the raw diff output in the commit message.

Follow good Git style:

- Separate the subject from the body with a blank line
- Try to limit the subject line to 50 characters
- Capitalize the subject line
- Do not end the subject line with any punctuation
- Use the imperative mood in the subject line
- Wrap the body at 72 characters
- Keep the body short and concise (omit it entirely if not useful)

1. 기본적으로 모든 답변은 한국어로 답변한다.
2. 기본적으로 모든 파일구조는 FSD 패턴을 따름.
3. 기본 css는 tailwind를 사용한다.
4. 기본 className은 인라인에 작성하지만 공통된 스타일이나 애니메이션 정의가 필요시 global css를 사용한다.
5. 모든 기본 단위들은 tailwind의 utility classes를 사용한다.
6. [1px]같은 문법들은 최대한 지양하고 tailwind의 utility classes를 사용한다.
7. [1px]같은 값들은 근사값으로 절하하고 tailwind의 utility classes를 사용한다.
8. 테스트로 localhost를 동의 없이 키지 않는다.
9. 여백은 margin 사용을 지양하고 pedding으로 대체한다.
10. 작업이 끝나면 최종적으로 내용을 정리해 루트폴더 doc 폴더에 저장한다.
11. 검증을 위해 백그라운드로 띄운 서버를 제대로 종료했는지 작업끝나기전에 체크한다.
12. 문제점을 제시하면 분석하고 해결한다.
13. 커밋할떄 커밋메시지를 기본 앞에 태그를 잘 작성한다. ex) feat: 기능개발
