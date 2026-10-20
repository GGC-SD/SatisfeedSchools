import { generateStaticParams, render } from 'nextra/ssg'

export { generateStaticParams }

export default async function Page(props) {
  const params = await props.params
  const { html, title } = await render(params.mdxPath)
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}