import inlineCss from "inline-css";
import * as React from "react";
import { NotificationEventType } from "@shared/types";
import env from "@server/env";
import { Comment, Document, User } from "@server/models";
import NotificationSettingsHelper from "@server/models/helpers/NotificationSettingsHelper";
import BaseEmail, { EmailProps } from "./BaseEmail";
import Body from "./components/Body";
import Button from "./components/Button";
import Diff from "./components/Diff";
import EmailTemplate from "./components/EmailLayout";
import EmptySpace from "./components/EmptySpace";
import Footer from "./components/Footer";
import Header from "./components/Header";
import Heading from "./components/Heading";

type InputProps = EmailProps & {
  userId: string;
  documentId: string;
  actorName: string;
  isReply: boolean;
  commentId: string;
  collectionName: string | undefined;
  teamUrl: string;
  content: string;
};

type BeforeSend = {
  document: Document;
  body: string | undefined;
  isFirstComment: boolean;
  unsubscribeUrl: string;
};

type Props = InputProps & BeforeSend;

/**
 * Email sent to a user when a new comment is created in a document they are
 * subscribed to.
 */
export default class CommentCreatedEmail extends BaseEmail<
  InputProps,
  BeforeSend
> {
  protected async beforeSend({
    documentId,
    userId,
    commentId,
    content,
  }: InputProps) {
    const document = await Document.unscoped().findByPk(documentId);
    if (!document) {
      return false;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return false;
    }

    const firstComment = await Comment.findOne({
      attributes: ["id"],
      where: { documentId },
      order: [["createdAt", "ASC"]],
    });
    const isFirstComment = firstComment?.id === commentId;

    // inline all css so that it works in as many email providers as possible.
    let body;
    if (content) {
      body = await inlineCss(content, {
        url: env.URL,
        applyStyleTags: true,
        applyLinkTags: false,
        removeStyleTags: true,
      });
    }

    return {
      document,
      isFirstComment,
      body,
      unsubscribeUrl: NotificationSettingsHelper.unsubscribeUrl(
        user,
        NotificationEventType.CreateComment
      ),
    };
  }

  protected subject({ isFirstComment, document }: Props) {
    return `${isFirstComment ? "" : "Re: "}New comment on “${document.title}”`;
  }

  protected preview({ isReply, actorName }: Props): string {
    return isReply
      ? `${actorName} replied in a thread`
      : `${actorName} commented on the document`;
  }

  protected fromName({ actorName }: Props): string {
    return actorName;
  }

  protected renderAsText({
    actorName,
    teamUrl,
    isReply,
    document,
    commentId,
    collectionName,
  }: Props): string {
    return `
${actorName} ${isReply ? "replied to a thread in" : "commented on"} "${
      document.title
    }"${collectionName ? `in the ${collectionName} collection` : ""}.

Open Thread: ${teamUrl}${document.url}?commentId=${commentId}
`;
  }

  protected render({
    document,
    actorName,
    isReply,
    collectionName,
    teamUrl,
    commentId,
    unsubscribeUrl,
    body,
  }: Props) {
    const link = `${teamUrl}${document.url}?commentId=${commentId}&ref=notification-email`;

    return (
      <EmailTemplate>
        <Header />

        <Body>
          <Heading>{document.title}</Heading>
          <p>
            {actorName} {isReply ? "replied to a thread in" : "commented on"}{" "}
            <a href={link}>{document.title}</a>{" "}
            {collectionName ? `in the ${collectionName} collection` : ""}.
          </p>
          {body && (
            <>
              <EmptySpace height={20} />
              <Diff>
                <div dangerouslySetInnerHTML={{ __html: body }} />
              </Diff>
              <EmptySpace height={20} />
            </>
          )}
          <p>
            <Button href={link}>Open Thread</Button>
          </p>
        </Body>

        <Footer unsubscribeUrl={unsubscribeUrl} />
      </EmailTemplate>
    );
  }
}
