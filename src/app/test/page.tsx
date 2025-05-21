import Link from "next/link";


export default function Page() {

  return(
    <div className='flex w-full h-[500px] pt-[150px]'>This is a test page
      <Link href='/test/textuploader'>
        <div>textuploader</div>
      </Link>
    </div>
  )
}